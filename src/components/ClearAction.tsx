import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useEditorStore } from '@/state/editorStore'
import { needsClearConfirmation, clearSession } from '@/starter/clear'
import { STARTER_TEXT } from '@/starter/model'
import { strings } from '@/strings'

export function ClearAction() {
  const editorText = useEditorStore((state) => state.editorText)
  const announce = useEditorStore((state) => state.announce)
  const [open, setOpen] = useState(false)
  const clearButtonRef = useRef<HTMLButtonElement>(null)

  function runClear() {
    clearSession()
    announce(strings.clear.completed)
  }

  function handleClearClick() {
    if (needsClearConfirmation(editorText, STARTER_TEXT)) {
      setOpen(true)
      return
    }
    runClear()
  }

  return (
    <>
      <Button ref={clearButtonRef} type="button" variant="outline" onClick={handleClearClick} data-testid="clear-button">
        {strings.clear.button}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent
          data-testid="clear-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            clearButtonRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.clear.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{strings.clear.dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="clear-dialog-cancel">{strings.clear.dialogCancel}</AlertDialogCancel>
            <AlertDialogAction data-testid="clear-dialog-confirm" onClick={runClear}>
              {strings.clear.dialogConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ClearAction
