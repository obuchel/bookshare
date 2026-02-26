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
        await db.execute({ sql: "UPDATE borrow_requests SET status='approved', responded_at=datetime('now') WHERE id=?", args: [params.id] });
        break;

      case "reject":
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "pending") return NextResponse.json({ error: "Can only reject pending requests" }, { status: 400 });
        await db.execute({ sql: "UPDATE borrow_requests SET status='rejected', responded_at=datetime('now') WHERE id=?", args: [params.id] });
        break;

      case "mark_borrowed":
        if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "approved") return NextResponse.json({ error: "Can only mark approved requests as borrowed" }, { status: 400 });
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (request.borrow_days as number || 14));
        await db.execute({
          sql: "UPDATE borrow_requests SET status='borrowed', borrowed_at=datetime('now'), due_date=? WHERE id=?",
          args: [dueDate.toISOString().split("T")[0], params.id],
        });
        await db.execute({ sql: "UPDATE books SET status='borrowed' WHERE id=?", args: [request.book_id as string] });
        break;

      case "mark_returned":
        if (!isOwner && !isRequester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (request.status !== "borrowed") return NextResponse.json({ error: "Can only mark borrowed books as returned" }, { status: 400 });
        await db.execute({
          sql: "UPDATE borrow_requests SET status='returned', returned_at=datetime('now') WHERE id=?",
          args: [params.id],
        });
        await db.execute({ sql: "UPDATE books SET status='available' WHERE id=?", args: [request.book_id as string] });
        await db.execute({ sql: "UPDATE users SET books_borrowed = books_borrowed + 1 WHERE id=?", args: [request.requester_id as string] });
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
