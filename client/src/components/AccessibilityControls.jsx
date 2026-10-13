import { useKiosk } from '../context/KioskContext.jsx';
import { Sun, Type, Volume2 } from 'lucide-react';

export default function AccessibilityControls() {
  const { kiosk, update } = useKiosk();
  return (
    <div className="flex gap-2 items-center">
      <button onClick={() => update({ highContrast: !kiosk.highContrast })}
        title="High Contrast"
        className={`p-2 rounded-lg border touch-target ${kiosk.highContrast ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border-gray-300'}`}>
        <Sun size={18} />
      </button>
      <button onClick={() => update({ largeText: !kiosk.largeText })}
        title="Large Text"
        className={`p-2 rounded-lg border touch-target ${kiosk.largeText ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border-gray-300'}`}>
        <Type size={18} />
      </button>
      <button onClick={() => update({ audioGuided: !kiosk.audioGuided })}
        title="Audio Guided"
        className={`p-2 rounded-lg border touch-target ${kiosk.audioGuided ? 'bg-teal-500 text-white' : 'bg-white text-gray-700 border-gray-300'}`}>
        <Volume2 size={18} />
      </button>
    </div>
  );
}
