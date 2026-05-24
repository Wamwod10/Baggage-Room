import { Bell } from "lucide-react";
import "./notificationBell.scss";

export default function NotificationBell({ count = 0, onClick }) {
  return (
    <button type="button" className="notification-bell" onClick={onClick}>
      <Bell size={18} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
