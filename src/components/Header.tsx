import type { User } from "../types/auth";

type HeaderProps = {
  user: User;
  isOnline: boolean;
  onLogout: () => void;
};

export default function Header({ user, isOnline, onLogout }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">{isOnline ? "Online" : "Offline PWA"}</p>
        <h1>Sale Ledger</h1>
        <p className="subtitle">
          Track daily cash, PhonePe/UPI, expenses, total collection, and profit.
        </p>
      </div>

      <div className="user-card">
        <span>{user.name}</span>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
