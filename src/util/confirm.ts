import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a no-op, so destructive confirmations
// silently never fire on web. This wraps Alert.alert with a window.confirm
// fallback so the callbacks run in a browser.

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function confirmAction(opts: ConfirmOptions): void {
  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
  } = opts;

  if (Platform.OS === 'web') {
    const body = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined' && window.confirm(body)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

type NotifyOptions = {
  title: string;
  message?: string;
  onDismiss?: () => void;
};

export function notify(opts: NotifyOptions): void {
  const { title, message, onDismiss } = opts;

  if (Platform.OS === 'web') {
    const body = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(body);
    onDismiss?.();
    return;
  }

  Alert.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
}
