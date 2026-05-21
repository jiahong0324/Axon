export default function ToggleSwitch({ isOn, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none ${
        isOn ? 'bg-blue-500' : 'bg-slate-600'
      }`}
      style={{ minWidth: '48px', width: '48px', minHeight: '28px', height: '28px' }}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          isOn ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
