import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { resetPin } from "../../actions";

export default async function ResetPinPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requirePermission(session.user.role, "users:manage");

  const { id } = await params;
  const user = await db.appUser.findUnique({
    where: { id },
    include: { employee: { select: { nameAm: true } } },
  });
  if (!user) notFound();

  const action = resetPin.bind(null, id);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-ethiopic">ፒን ዳግም አቁም</h1>
      <p className="font-ethiopic text-gray-600">{user.employee?.nameAm ?? user.employeeCode}</p>

      <form action={action} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 font-ethiopic">አዲስ ፒን (4–6 ቁጥሮች)</label>
          <input name="newPin" type="password" inputMode="numeric" minLength={4} maxLength={6} required
            placeholder="••••"
            className="input-field tracking-widest text-center text-3xl" />
        </div>
        <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-700 font-ethiopic">
          ⚠️ ፒኑ ሲቀየር ሰውዬው ወዲያው ዳግም መግባት አለባቸው። ይህ ተግባር ወደ ፍተሻ ምዝግብ ይሄዳል።
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-amber-700">ፒን ዳግም አቁም</button>
          <a href="/users" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-ethiopic font-semibold text-center hover:bg-gray-200">ሰርዝ</a>
        </div>
      </form>
    </div>
  );
}
