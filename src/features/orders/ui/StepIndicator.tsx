interface Props {
  step: number;
  clientDone: boolean;
  serviceDone: boolean;
  detailsDone: boolean;
}

export default function StepIndicator({ step, clientDone, serviceDone, detailsDone }: Props) {
  return (
    <div className="steps">
      <div className={`step-dot ${step === 1 ? 'active' : ''} ${clientDone ? 'done' : ''}`} />
      <div className={`step-connector ${clientDone ? 'filled' : ''}`} />
      <div className={`step-dot ${step === 2 ? 'active' : ''} ${serviceDone ? 'done' : ''}`} />
      <div className={`step-connector ${serviceDone ? 'filled' : ''}`} />
      <div className={`step-dot ${step === 3 ? 'active' : ''} ${detailsDone ? 'done' : ''}`} />
    </div>
  );
}
