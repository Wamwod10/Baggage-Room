import { Search } from "lucide-react";
import "./searchBar.scss";

export default function SearchBar({ value, onChange, placeholder = "Qidirish..." }) {
  return (
    <label className="search-bar">
      <Search size={18} />
      <input value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}
