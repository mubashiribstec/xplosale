import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  href?: string;
  color?: "blue" | "yellow" | "green" | "red" | "gray";
}

const colorMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  green: "bg-green-50 border-green-200 text-green-700",
  red: "bg-red-50 border-red-200 text-red-700",
  gray: "bg-gray-50 border-gray-200 text-gray-700",
};

const valueColorMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  blue: "text-blue-900",
  yellow: "text-yellow-900",
  green: "text-green-900",
  red: "text-red-900",
  gray: "text-gray-900",
};

export function StatCard({ label, value, href, color = "gray" }: StatCardProps) {
  const cardClass = `rounded-xl border p-5 ${colorMap[color]}`;

  const content = (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueColorMap[color]}`}>{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
