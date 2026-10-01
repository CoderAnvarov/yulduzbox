export function formatUZS(value: number): string {
  return `${String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`;
}

export function formatNumber(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function userLabel(u: { first_name: string | null; username: string | null; telegram_id: number }): string {
  const name = u.first_name || "Foydalanuvchi";
  return u.username ? `${name} (@${u.username})` : `${name} (ID ${u.telegram_id})`;
}
