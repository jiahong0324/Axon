import Modal from './Modal'
import { useState } from 'react'

export default function ConfirmModal({ isOpen, title = 'Are you sure?', message, confirmText = 'Confirm', onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="muted mb-5">{message}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn-ghost w-full sm:w-auto" onClick={onCancel}>Cancel</button>
        <button className="btn-danger w-full sm:w-auto" onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  )
}

export function useConfirmDialog() {
  const [options, setOptions] = useState(null)

  function confirm(nextOptions) {
    return new Promise(resolve => {
      setOptions({
        title: 'Are you sure?',
        confirmText: 'Confirm',
        ...nextOptions,
        resolve
      })
    })
  }

  const dialog = (
    <ConfirmModal
      isOpen={Boolean(options)}
      title={options?.title}
      message={options?.message}
      confirmText={options?.confirmText}
      onCancel={() => { options?.resolve(false); setOptions(null) }}
      onConfirm={() => { options?.resolve(true); setOptions(null) }}
    />
  )

  return { confirm, ConfirmDialog: dialog }
}
