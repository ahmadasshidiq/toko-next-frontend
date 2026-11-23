import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
};

/** Empty-state row for data tables; spans every column. */
export default function TableEmpty({
  title = "Belum ada data",
  description = "Data yang ditambahkan akan muncul di sini",
}: Props) {
  return (
    <tr>
      <td colSpan={100} className="px-5 py-12 text-center">
        <Inbox className="mx-auto h-10 w-10 text-gray-300" />
        <div className="mt-2 text-sm font-medium text-gray-600">{title}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </td>
    </tr>
  );
}
