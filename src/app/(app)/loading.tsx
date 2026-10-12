import { Loader } from "@/components/charts";

export default function Loading() {
  return (
    <div className="page-loading">
      <Loader purple lg />
      Reading the radar…
    </div>
  );
}
