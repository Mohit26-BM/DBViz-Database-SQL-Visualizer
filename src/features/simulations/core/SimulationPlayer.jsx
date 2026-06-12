import SimLayout from '../../../components/shared/SimLayout'
import Controls from '../../../components/shared/Controls'
import AIExplainer from '../../../components/shared/AIExplainer'
import { usePlayer } from '../../../hooks/usePlayer'

/**
 * Generic simulation shell. Every simulator provides:
 *   renderLeft(ctx)   → left sidebar JSX
 *   renderCenter(ctx) → main canvas JSX
 *   renderRight(ctx)  → optional code/info panel JSX
 *
 * ctx = { step, currentStep, total, reset, player }
 * where player exposes { play, pause, stepForward, stepBack, changeSpeed, speed, playing, steps }
 *
 * Steps are loaded by calling ctx.reset(stepArray) from within renderLeft (e.g. on button click).
 */
export default function SimulationPlayer({
  title,
  subtitle,
  accentColor = 'blue',
  help,
  renderLeft,
  renderCenter,
  renderRight,
}) {
  const player = usePlayer()
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = player
  const step = steps[currentStep] ?? null

  const ctx = { step, currentStep, total: steps.length, reset, player }

  return (
    <SimLayout
      title={title}
      subtitle={subtitle}
      accentColor={accentColor}
      help={help}
      left={renderLeft?.(ctx)}
      center={renderCenter?.(ctx)}
      timeline={steps.length > 0 && (
        <div className="space-y-3">
          <Controls
            playing={playing}
            onPlay={play}
            onPause={pause}
            onForward={stepForward}
            onBack={stepBack}
            onReset={() => reset([])}
            current={currentStep}
            max={steps.length - 1}
            speed={speed}
            onSpeedChange={changeSpeed}
          />
          {!playing && step && (
            <AIExplainer
              key={`${title}-${currentStep}`}
              simulation={title}
              step={step}
              stepIndex={currentStep}
              totalSteps={steps.length}
            />
          )}
        </div>
      )}
      rightPanel={renderRight?.(ctx)}
    />
  )
}
