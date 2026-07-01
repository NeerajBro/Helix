import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BotService, BotIntentRule } from '../../core/services/bot.service';

@Component({
  selector: 'app-bot-studio',
  imports: [RouterLink],
  templateUrl: './bot-studio.component.html',
  styleUrl: './bot-studio.component.scss',
})
export class BotStudioComponent implements OnInit {
  private readonly botService = inject(BotService);

  protected readonly loading = signal(true);
  protected readonly intents = signal<BotIntentRule[]>([]);

  ngOnInit(): void {
    this.botService.getIntents().subscribe({
      next: (data) => {
        this.intents.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
