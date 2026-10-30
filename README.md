# Koi Pond

A reusable React + TypeScript canvas background inspired by the interactive ASCII koi pond at [daoho.dev](https://www.daoho.dev/), with pixel-tiled lotus flowers and lily pads. This is an independent recreation, not a copy of the original site's component.

The component lives in **`src/components/KoiPond.tsx`**. It is one self-contained file; it needs React but no images, fonts, canvas libraries, or additional stylesheets. The rest of this project is an optional Vite demo.

## Try the demo

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Use **Fish style** in the settings panel to choose a koi variety, goldfish, betta, or a mixed pond. Choose **Custom mix** to pick several styles yourself. Adjust **Lotus flowers** to add or remove blooms and their lily pads. Click the water to feed the fish. For a production build, run `npm run build`.

## Use the component

Copy `src/components/KoiPond.tsx` into a React project, then import it. Give the pond an explicit height; the canvas fills its container.

```tsx
import { KoiPond } from './components/KoiPond';

export default function Page() {
  return (
    <KoiPond
      fishCount={6}
      fishTypes={['kohaku', 'goldfish', 'betta']}
      lotusCount={3}
      lotusScale={1}
      speed={1}
      theme="dark"
      interactive
      style={{ width: '100%', height: '100vh' }}
    >
      <main data-pond-avoid data-pond-ignore>
        <h1>Hello, world.</h1>
        <p>Your content sits above the pond.</p>
      </main>
    </KoiPond>
  );
}
```

The file includes `"use client"` for Next.js App Router. The canvas is decorative and hidden from assistive technology. Children remain normal, accessible HTML.

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `fishCount` | `number` | `6` | Number of fish, rounded and clamped to 0–12. |
| `fishTypes` | `readonly FishType[]` | `['kohaku', 'sanke', 'tancho', 'showa']` | Choose one or mix several: `'kohaku'`, `'sanke'`, `'tancho'`, `'showa'`, `'goldfish'`, `'betta'`. The fish cycle through the supplied styles in order. |
| `lotusCount` | `number` | `3` | Number of lotus flower clusters, rounded and clamped to 0–8. Each bloom comes with lily pads; `0` hides all flowers and pads. |
| `lotusScale` | `number` | `1` | Size multiplier for flowers and lily pads, clamped to 0.5–1.8. |
| `speed` | `number` | `1` | Simulation speed multiplier, clamped to 0.1–3. |
| `theme` | `'dark' \| 'light'` | `'dark'` | Water background and fish palette. |
| `interactive` | `boolean` | `true` | Follow the pointer, scatter on fast swipes, and feed on an open-water click or tap. |
| `paused` | `boolean` | `false` | Freeze the animation. |
| `className` / `style` | React DOM props | — | Size and style the pond container. |
| `children` | `ReactNode` | — | Content placed above the canvas. |
| `onStatsChange` | `(stats: { koi: number; pellets: number }) => void` | — | Called when the counts change. `koi` is the total fish count, including non-koi styles, for backwards compatibility. |

For one type, use e.g. `fishTypes={['goldfish']}`. For a custom mix, pass several types: `fishTypes={['goldfish', 'betta']}`. Repeat a type to weight the mix, e.g. `['goldfish', 'goldfish', 'betta']`. Changing this prop restyles the fish already in the pond without restarting the animation. If the list is empty or contains no valid values, the default koi mix is used. When `fishCount` is smaller than the list, only the first styles in the list will appear.

Mark elements with **`data-pond-avoid`** to have the fish steer away and the fish, flowers, and pads fade beneath them. Add **`data-pond-ignore`** to exclude an area from pointer following and click feeding; links, buttons, inputs, and other interactive controls are excluded automatically. The flowers and pads float above the fish and gently drift while the pond is playing.

### Let visitors choose a fish

```tsx
import { useState } from 'react';
import { KoiPond, type FishType } from './components/KoiPond';

function PondPicker() {
  const [fish, setFish] = useState<FishType>('kohaku');
  return (
    <KoiPond fishTypes={[fish]} style={{ height: '100vh' }}>
      <label data-pond-ignore>
        Fish style
        <select value={fish} onChange={event => setFish(event.target.value as FishType)}>
          <option value="kohaku">Kohaku koi</option>
          <option value="sanke">Sanke koi</option>
          <option value="tancho">Tancho koi</option>
          <option value="showa">Showa koi</option>
          <option value="goldfish">Goldfish</option>
          <option value="betta">Blue betta</option>
        </select>
      </label>
    </KoiPond>
  );
}
```

### Programmatic feeding and reset

```tsx
import { useRef } from 'react';
import { KoiPond, type KoiPondHandle } from './components/KoiPond';

function Example() {
  const pond = useRef<KoiPondHandle>(null);
  return (
    <KoiPond ref={pond} style={{ height: 500 }}>
      <button onClick={() => pond.current?.feed()}>Feed at center</button>
      <button onClick={() => pond.current?.feed(100, 150)}>Feed at x=100, y=150</button>
      <button onClick={() => pond.current?.reset()}>New arrangement</button>
    </KoiPond>
  );
}
```

Coordinates are CSS pixels relative to the pond. `feed()` works even when pointer interaction is turned off. If paused, food appears and the fish can eat it once resumed. `reset()` clears food and makes a new arrangement while retaining the current props.

The component observes its container's size and pauses when offscreen or the tab is hidden. It respects the user's **reduced-motion** preference by rendering a still frame and disabling feeding. Observers, listeners, and animation frames are cleaned up on unmount.

## Demo fonts

The demo uses DM Sans, DM Mono, and Instrument Serif, distributed under the SIL Open Font License; their license texts are in `src/assets/fonts/licenses/`. The pond component itself does not require these fonts.
