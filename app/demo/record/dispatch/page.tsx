import { DemoScenePlayer } from "@/components/demo/DemoScenePlayer";
import { DEMO_SCENES } from "@/lib/demo-scripts";

export default function DispatchDemoRecordPage() {
  const scene = DEMO_SCENES.dispatch;
  return (
    <DemoScenePlayer
      steps={scene.steps}
      statusTime={scene.statusTime}
      title={scene.title}
      subtitle={scene.subtitle}
      loop={false}
    />
  );
}
