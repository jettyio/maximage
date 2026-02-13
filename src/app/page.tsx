import { LaunchForm } from "@/components/LaunchForm";
import { RunHistory } from "@/components/RunHistory";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Launch a run</h2>
        <LaunchForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent runs</h2>
        <RunHistory />
      </section>
    </div>
  );
}
