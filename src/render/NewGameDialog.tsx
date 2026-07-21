// 新游戏设置弹窗：选择文明/难度/地图尺寸
import { useState } from 'react';
import { useGame } from './store';
import { CIVILIZATIONS } from '../gamedata';
import { portraitAssetUrl } from './assets';
import { theme } from './theme';
import { btnStyle } from './uiStyles';
import type { Difficulty } from '../logic/state/types';

const DIFFICULTIES: { id: Difficulty; name: string }[] = [
  { id: 'settler', name: '开拓者' },
  { id: 'chieftain', name: '酋长' },
  { id: 'warlord', name: ' warlord' },
  { id: 'prince', name: '亲王' },
  { id: 'king', name: '国王' },
  { id: 'emperor', name: '皇帝' },
];

const MAP_SIZES = [
  { id: 'small', width: 16, height: 12, label: '小 (16×12)' },
  { id: 'medium', width: 24, height: 16, label: '中 (24×16)' },
  { id: 'large', width: 36, height: 24, label: '大 (36×24)' },
];

const CIV_IDS = ['rome', 'china', 'greece', 'egypt', 'aztec', 'england', 'america', 'japan', 'germany', 'france', 'russia'];

interface NewGameDialogProps {
  onClose: () => void;
}

export function NewGameDialog({ onClose }: NewGameDialogProps) {
  const newGame = useGame((s) => s.newGame);
  const [playerCiv, setPlayerCiv] = useState('rome');
  const [aiCivs, setAiCivs] = useState(['greece', 'china']);
  const [difficulty, setDifficulty] = useState<Difficulty>('prince');
  const [mapSize, setMapSize] = useState('medium');

  const availableCivs = CIV_IDS.filter((c) => c !== playerCiv && !aiCivs.includes(c));

  const startGame = () => {
    const size = MAP_SIZES.find((s) => s.id === mapSize)!;
    const seed = Math.floor(Math.random() * 100000);
    const config = {
      mapSize: { width: size.width, height: size.height },
      civChoices: [
        { id: playerCiv, isAI: false },
        ...aiCivs.map((id) => ({ id, isAI: true })),
      ],
      difficulty,
      maxTurns: 300,
    };
    newGame(seed, config);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: theme.fontFamily,
    }}>
      <div style={{
        background: theme.colors.bgPanel, padding: 32, borderRadius: theme.borderRadius,
        maxWidth: 500, maxHeight: '85vh', overflowY: 'auto',
        border: `2px solid ${theme.colors.accent}`,
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, color: theme.colors.accent }}>新游戏</h2>

        {/* 玩家文明 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: theme.colors.text, marginBottom: 8 }}>你的文明</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CIV_IDS.map((civId) => {
              const civ = CIVILIZATIONS[civId];
              const selected = playerCiv === civId;
              return (
                <button key={civId} onClick={() => setPlayerCiv(civId)}
                  style={{
                    ...btnStyle, padding: '4px 8px', fontSize: 11,
                    background: selected ? theme.colors.primary : theme.colors.disabled,
                    border: selected ? `2px solid ${theme.colors.accent}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  <img src={portraitAssetUrl(civId)} alt="" width={24} height={30} style={{ borderRadius: 2, objectFit: 'cover' }} />
                  {civ?.name ?? civId}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI 文明 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: theme.colors.text, marginBottom: 8 }}>AI 对手（选 2 个）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableCivs.map((civId) => {
              const civ = CIVILIZATIONS[civId];
              const selected = aiCivs.includes(civId);
              const canSelect = aiCivs.length < 2 || selected;
              return (
                <button key={civId} onClick={() => {
                  if (selected) setAiCivs(aiCivs.filter((c) => c !== civId));
                  else if (aiCivs.length < 2) setAiCivs([...aiCivs, civId]);
                }}
                  style={{
                    ...btnStyle, padding: '4px 8px', fontSize: 11,
                    background: selected ? theme.colors.primary : theme.colors.disabled,
                    opacity: canSelect ? 1 : 0.4,
                    cursor: canSelect ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {civ?.name ?? civId}
                </button>
              );
            })}
          </div>
        </div>

        {/* 难度 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: theme.colors.text, marginBottom: 8 }}>难度</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                style={{
                  ...btnStyle, padding: '4px 12px', fontSize: 11,
                  background: difficulty === d.id ? theme.colors.primary : theme.colors.disabled,
                }}>
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* 地图尺寸 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: theme.colors.text, marginBottom: 8 }}>地图尺寸</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MAP_SIZES.map((s) => (
              <button key={s.id} onClick={() => setMapSize(s.id)}
                style={{
                  ...btnStyle, padding: '4px 12px', fontSize: 11,
                  background: mapSize === s.id ? theme.colors.primary : theme.colors.disabled,
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnStyle, background: theme.colors.disabled }}>取消</button>
          <button onClick={startGame} style={{ ...btnStyle, background: theme.colors.primary, fontWeight: 'bold' }}>开始游戏</button>
        </div>
      </div>
    </div>
  );
}