"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IBoard, IBuilding, IRuns, ISettings, IWeek } from "./icons";

const ITEMS = [
  { href: "/", label: "This week", Icon: IWeek },
  { href: "/pipeline", label: "Pipeline", Icon: IBoard },
  { href: "/companies", label: "Companies", Icon: IBuilding },
  { href: "/runs", label: "Runs", long: "& reliability", Icon: IRuns },
  { href: "/settings", label: "Settings", Icon: ISettings },
];

export function Nav({ hot }: { hot: number }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.map(({ href, label, long, Icon }) => {
        const on = href === "/" ? path === "/" || path.startsWith("/story") : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}>
            <Icon />
            <span>
              {label}
              {long && <span className="label-long"> {long}</span>}
            </span>
            {href === "/" && hot > 0 && <span className="count">{hot}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
