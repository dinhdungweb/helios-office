import {
  ArrowRight,
  CheckCircle,
  Circle,
  FlowArrow
} from "@phosphor-icons/react/dist/ssr";
import type { Workflow as WorkflowItem } from "@/lib/mock-data";

type HrmWorkflowsProps = {
  workflows: WorkflowItem[];
};

const healthTone = {
  "Ổn định": "ready",
  "Cần rà soát": "review",
  "Sắp triển khai": "planned"
} as const;

export function HrmWorkflows({ workflows }: HrmWorkflowsProps) {
  return (
    <section className="workflow-section" aria-labelledby="workflow-title">
      <div className="card-header">
        <div>
          <p className="eyebrow">HRM workflow</p>
          <h2 id="workflow-title">Luồng nghiệp vụ chính</h2>
        </div>
        <button className="secondary-button" type="button">
          Xem báo cáo
        </button>
      </div>

      <div className="workflow-grid">
        {workflows.map((workflow) => (
          <article className="workflow-card" id={workflow.name} key={workflow.name}>
            <header>
              <span className="workflow-icon">
                <FlowArrow size={18} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h3>{workflow.name}</h3>
                <p>{workflow.owner}</p>
              </div>
              <span className={`status-pill status-pill--${healthTone[workflow.health]}`}>
                {workflow.health}
              </span>
            </header>
            <p>{workflow.summary}</p>
            <ol className="step-list">
              {workflow.steps.map((step, index) => (
                <li key={step}>
                  {index === workflow.steps.length - 1 ? (
                    <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                  ) : (
                    <Circle size={15} weight="duotone" aria-hidden="true" />
                  )}
                  <span>{step}</span>
                  {index < workflow.steps.length - 1 ? (
                    <ArrowRight size={14} weight="duotone" aria-hidden="true" />
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
