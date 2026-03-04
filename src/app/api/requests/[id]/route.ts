import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    const result = await db.execute({ sql: "SELECT * FROM borrow_requests WHERE id = ?", args: [params.id] });
    const request = result.rows[0];
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = request.owner_id === user.id;
    const isRequester = request.requester_id === user.id;

    switch (action) {

      case "approve":
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "pending") return NextResponse.json({ error: "Can only approve pending requests" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET status='approved', responded_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        break;

      case "reject":
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!["pending", "waitlisted"].includes(request.status as string))
          return NextResponse.json({ error: "Can only reject pending or waitlisted requests" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET status='rejected', responded_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        // Re-number remaining waitlist
        await reorderWaitlist(request.book_id as string);
        break;

      case "mark_borrowed":
        // Owner marks book as physically handed over
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "approved") return NextResponse.json({ error: "Can only mark approved requests as given out" }, { status: 400 });
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (request.borrow_days as number || 14));
        await db.execute({
          sql: "UPDATE borrow_requests SET status='borrowed', borrowed_at=datetime('now'), due_date=? WHERE id=?",
          args: [dueDate.toISOString().split("T")[0], params.id],
        });
        await db.execute({ sql: "UPDATE books SET status='borrowed' WHERE id=?", args: [request.book_id as string] });
        break;

      case "confirm_received":
        // Borrower confirms they received the book
        if (!isRequester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "borrowed") return NextResponse.json({ error: "Can only confirm receipt of borrowed books" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET confirmed_received_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        break;

      case "request_return":
        // Borrower says they've returned the book — owner must confirm
        if (!isRequester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "borrowed") return NextResponse.json({ error: "Can only request return for borrowed books" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET status='return_requested', return_requested_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        break;

      case "confirm_return":
        // Owner confirms they got the book back
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!["borrowed", "return_requested"].includes(request.status as string))
          return NextResponse.json({ error: "Invalid status for return confirmation" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET status='returned', returned_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        await db.execute({ sql: "UPDATE users SET books_borrowed = books_borrowed + 1 WHERE id=?", args: [request.requester_id as string] });

        // Promote next person in waitlist to pending
        await promoteNextInWaitlist(request.book_id as string);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await db.execute({ sql: "SELECT * FROM borrow_requests WHERE id=?", args: [params.id] });
    return NextResponse.json({ request: updated.rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// After return, promote the next waitlisted person to pending
async function promoteNextInWaitlist(bookId: string) {
  const next = await db.execute({
    sql: "SELECT * FROM borrow_requests WHERE book_id = ? AND status = 'waitlisted' ORDER BY queue_position ASC LIMIT 1",
    args: [bookId],
  });
  if (next.rows[0]) {
    await db.execute({
      sql: "UPDATE borrow_requests SET status='pending', queue_position=1, responded_at=NULL WHERE id=?",
      args: [next.rows[0].id as string],
    });
    // Book stays available until owner approves and marks given
    await db.execute({ sql: "UPDATE books SET status='available' WHERE id=?", args: [bookId] });
    // Re-number remaining waitlist
    await reorderWaitlist(bookId);
  } else {
    // No waitlist — book is simply available again
    await db.execute({ sql: "UPDATE books SET status='available' WHERE id=?", args: [bookId] });
  }
}

// Keep queue_position sequential after rejections/cancellations
async function reorderWaitlist(bookId: string) {
  const waitlisted = await db.execute({
    sql: "SELECT id FROM borrow_requests WHERE book_id = ? AND status = 'waitlisted' ORDER BY queue_position ASC",
    args: [bookId],
  });
  for (let i = 0; i < waitlisted.rows.length; i++) {
    await db.execute({
      sql: "UPDATE borrow_requests SET queue_position=? WHERE id=?",
      args: [i + 2, waitlisted.rows[i].id as string], // +2 because position 1 is the active borrower
    });
  }
}
