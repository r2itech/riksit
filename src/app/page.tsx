import { LocaleProvider } from "@/components/LocaleProvider";
import RiksitApp from "@/components/RiksitApp";

export default function HomePage() {
  return (
    <LocaleProvider>
      <RiksitApp />
    </LocaleProvider>
  );
}
