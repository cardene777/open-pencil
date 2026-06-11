import { AbsoluteFill } from 'remotion'
import { KenBurns } from '../components/KenBurns'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'

export const SceneDashboard: React.FC = () => {
  return (
    <SceneFade>
      <KenBurns src="shots/dashboard.png" zoom="in" startScale={1.02} endScale={1.16} />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(13,16,23,0.0) 60%, rgba(13,16,23,0.75) 100%)'
        }}
      />
      <Caption
        title="プロジェクトを 1 画面で管理"
        subtitle="ボード・チーム・通知を集約したダッシュボード"
        position="bottom"
      />
    </SceneFade>
  )
}
