import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto pt-8 pb-4 text-center border-t">
      <p className="text-sm text-gray-500">
        <Link href="/dashboard">Student Dashboard</Link>
        <span className="mx-2">•</span>
        <Link href="/teacher">Teacher Dashboard</Link>
      </p>
    </footer>
  );
}