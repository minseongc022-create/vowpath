import { DemoScenePlayer } from "@/components/demo/DemoScenePlayer";
import { DEMO_SCENES } from "@/lib/demo-scripts";

export default function VoiceDemoRecordPage() {
  const scene = DEMO_SCENES.voice;
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
