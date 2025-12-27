// A simple in-memory notification suppression service.
// In a real-world app, this would integrate with a more robust notification system.

type NotificationListener = (notification: any) => void;

class NotificationManager {
  private listeners: NotificationListener[] = [];
  private isSuppressed = false;

  subscribe(listener: NotificationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  suppress() {
    this.isSuppressed = true;
  }

  unsuppress() {
    this.isSuppressed = false;
  }

  // This method would be called by the app's notification system.
  // We are simulating it here for demonstration purposes.
  show(notification: any) {
    if (!this.isSuppressed) {
      this.listeners.forEach(listener => listener(notification));
    }
  }
}

export const notificationManager = new NotificationManager();
