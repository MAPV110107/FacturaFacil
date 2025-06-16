import type { SVGProps } from "react";
import { ReceiptText } from "lucide-react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <ReceiptText className="h-8 w-8 text-primary" {...props} />
  );
}
