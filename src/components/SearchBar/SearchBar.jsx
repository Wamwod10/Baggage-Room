import { Search } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";
import "./searchBar.scss";

export default function SearchBar({ value, onChange, placeholder }) {
  const { t } = useTranslation();

  return (
    <label className="search-bar">
      <Search size={18} />
      <input value={value} onChange={onChange} placeholder={placeholder || t("Qidirish...")} />
    </label>
  );
}
