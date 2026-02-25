import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    // action: "approve" | "reject" | "mark_borrowed" | "mark_returned"

    const reqResult = await db.execute({
      sql: "SELECT * FROM borrow_requests WHERE id = ?",
      args: [params.id],
    });
    const request = reqResult.rows[0];
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = request.owner_id === user.id;
    const isRequester = request.requester_id === user.id;

    if (action === "approve" || action === "reject") {
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const newStatus = action === "approve" ? "approved" : "rejected";
      await db.execute({
        sql: `UPDATE borrow_requests SET status = ?, responded_at = datetime('now') WHERE id = ?`,
        args: [newStatus, params.id],
      });

      // If approved, mark book as reserved
      if (action === "approve") {
        await db.execute({
          sql: "UPDATE books SET status = 'reserved' WHERE id = ?",
          args: [request.book_id as string],
        });
        // Reject all other pending requests for this book
        await db.execute({
          sql: `UPDATE borrow_requests SET status = 'rejected', responded_at = datetime('now')
                WHERE book_id = ? AND id != ? AND status = 'pending'`,
          args: [request.book_id as string, params.id],
        });
      }
    } else if (action === "mark_borrowed") {
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (request.status !== "approved")
        return NextResponse.json({ error: "Request must be approved first" }, { status: 400 });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (request.borrow_days as number));

      await db.execute({
        sql: `UPDATE borrow_requests SET status = 'borrowed', borrowed_at = datetime('now'), due_date = ? WHERE id = ?`,
        args: [dueDate.toISOString().split("T")[0], params.id],
      });
      await db.execute({
        sql: "UPDATE books SET status = 'borrowed' WHERE id = ?",
        args: [request.book_id as string],
      });
      await db.execute({
        sql: "UPDATE users SET books_borrowed = books_borrowed + 1 WHERE id = ?",
        args: [request.requester_id as string],
      });
    } else if (action === "mark_returned") {
      if (!isOwner && !isRequester)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (request.status !== "borrowed")
        return NextResponse.json({ error: "Book is not currently borrowed" }, { status: 400 });

      await db.execute({
        sql: `UPDATE borrow_requests SET status = 'returned', returned_at = datetime('now') WHERE id = ?`,
        args: [params.id],
      });
      await db.execute({
        sql: "UPDATE books SET status = 'available' WHERE id = ?",
        args: [request.book_id as string],
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await db.execute({
      sql: `SELECT r.*, b.title as book_title, b.cover_url as book_cover
            FROM borrow_requests r JOIN books b ON r.book_id = b.id WHERE r.id = ?`,
      args: [params.id],
    });

    return NextResponse.json({ request: updated.rows[0] });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
