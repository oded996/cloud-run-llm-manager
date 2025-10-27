import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export interface LogEntry {
  severity: 'info' | 'debug';
  timestamp: string;
  summary: string;
}

@Component({
  selector: 'app-logs-view',
  templateUrl: './logs-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsViewComponent {
  logs = signal<LogEntry[]>([
    { severity: 'info', timestamp: '2025-10-23 17:06:56.590 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:00.968 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:09.645 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:30.023 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:51.895 PDT', summary: 'GET 200 20.81 KB 2 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:53.749 PDT', summary: 'GET 200 20.81 KB 2 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:56.091 PDT', summary: 'GET 200 20.81 KB 2 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:07:59.963 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:11.161 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:30.386 PDT', summary: 'GET 200 20.81 KB 2 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:31.028 PDT', summary: 'GET 200 7 KB 852 ms Safari 18 https://frontend-paris-6rwm66ar2a-od.a.run.app/pick?eventId=5170975272861696&participantId=4884625508270080' },
    { severity: 'info', timestamp: '2025-10-23 17:08:51.893 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:53.107 PDT', summary: 'GET 200 20.81 KB 3 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:56.737 PDT', summary: 'GET 200 20.81 KB 6 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:56.965 PDT', summary: 'GET 200 4.08 KB 8 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/images/secret-santa-principle.svg' },
    { severity: 'info', timestamp: '2025-10-23 17:08:57.534 PDT', summary: 'GET 200 9.17 KB 7 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/javascripts/index.js' },
    { severity: 'info', timestamp: '2025-10-23 17:08:57.534 PDT', summary: 'GET 206 3.18 MB 92 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/videos/cadeaux-entre-nous-comment-ca-marche.mp4' },
    { severity: 'info', timestamp: '2025-10-23 17:08:57.611 PDT', summary: 'GET 200 20.81 KB 14 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:08:57.989 PDT', summary: 'GET 200 716 B 6 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/images/favicon.png' },
    { severity: 'info', timestamp: '2025-10-23 17:09:00.003 PDT', summary: 'GET 200 20.81 KB 2 ms GoogleStackdriverMonitoring-UptimeChe... https://frontend-paris-6rwm66ar2a-od.a.run.app/' },
    { severity: 'info', timestamp: '2025-10-23 17:09:00.177 PDT', summary: 'GET 200 13.18 KB 3 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/faq' },
    { severity: 'info', timestamp: '2025-10-23 17:09:00.365 PDT', summary: 'GET 200 715 B 15 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/javascripts/faq.js' },
    { severity: 'debug', timestamp: '2025-10-23 17:09:06.049 PDT', summary: 'Found 0 events for email .' },
    { severity: 'debug', timestamp: '2025-10-23 17:09:06.049 PDT', summary: 'Could not find event for organizer email' },
    { severity: 'info', timestamp: '2025-10-23 17:09:07.132 PDT', summary: 'GET 200 20.81 KB 3 ms Chrome 141 https://frontend-paris-906505197961.europe-west9.run.app/' },
  ]);
}
