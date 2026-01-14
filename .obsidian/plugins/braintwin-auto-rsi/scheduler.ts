export class RSIScheduler {
    private intervalId: number | null = null;
    private callback: () => void;

    constructor(callback: () => void) {
        this.callback = callback;
    }

    start(scheduleTime: string, scheduleType: 'daily' | 'weekly', dayOfWeek?: number): void {
        this.stop(); // Clear any existing schedule

        // Parse time
        const [hours, minutes] = scheduleTime.split(':').map(Number);

        // Check every minute
        this.intervalId = window.setInterval(() => {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentDay = now.getDay();

            // Check if it's time to run
            if (currentHours === hours && currentMinutes === minutes) {
                if (scheduleType === 'daily') {
                    this.callback();
                } else if (scheduleType === 'weekly' && currentDay === dayOfWeek) {
                    this.callback();
                }
            }
        }, 60000); // Check every minute

        console.log(`Scheduler started: ${scheduleType} at ${scheduleTime}`);
    }

    stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Scheduler stopped');
        }
    }
}