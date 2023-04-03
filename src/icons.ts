import { addIcon } from '@iconify/vue'
import { IconifyIcon } from '@iconify/vue/offline'
import outlineChat from '@iconify-icons/ic/outline-chat'
import outlineMail from '@iconify-icons/ic/outline-mail'
import roundPersonOutline from '@iconify-icons/ic/round-person-outline'
import roundPerson from '@iconify-icons/ic/round-person'
import baselineLanguage from '@iconify-icons/ic/baseline-language'
import baselineBrush from '@iconify-icons/ic/baseline-brush'
import baselineEdit from '@iconify-icons/ic/baseline-edit'
import baselineClose from '@iconify-icons/ic/baseline-close'
import outlineDelete from '@iconify-icons/ic/outline-delete'
import roundCheck from '@iconify-icons/ic/round-check'
import roundSearch from '@iconify-icons/ic/round-search'
import roundWarning from '@iconify-icons/ic/round-warning'
import roundInfo from '@iconify-icons/ic/round-info'
import roundAddCircleOutline from '@iconify-icons/ic/round-add-circle-outline'

const icons: Record<string, IconifyIcon> = {
  'baseline-close': baselineClose,
  'outline-chat': outlineChat,
  'outline-mail': outlineMail,
  'round-person-outline': roundPersonOutline,
  'round-person': roundPerson,
  'baseline-language': baselineLanguage,
  'baseline-brush': baselineBrush,
  'baseline-edit': baselineEdit,
  'outline-delete': outlineDelete,
  'round-check': roundCheck,
  'round-search': roundSearch,
  'round-warning': roundWarning,
  'round-info': roundInfo,
  'round-add-circle-outline': roundAddCircleOutline,
}

export function iconsInitialization() {
  console.info('\n--- ICONS INITIALIZATION ---\n')

  Object.keys(icons).forEach(name => {
    addIcon(name, icons[name])
  })
}
