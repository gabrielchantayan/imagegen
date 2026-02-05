/**
 * Undo Manager for Builder Store
 *
 * Implements a history stack for undo/redo functionality.
 * Stores snapshots of the relevant state for restoration.
 * Uses structuredClone for efficient deep cloning.
 */

import type { Component } from "@/lib/types/database";

// The parts of state we track for undo/redo
type UndoableState = {
  subjects: Array<{
    id: string;
    selections: Record<string, Component[]>;
  }>;
  shared_selections: Record<string, Component[]>;
  selected_reference_ids: string[];
  active_subject_id: string | null;
};

type HistoryEntry = {
  state: UndoableState;
  description: string;
  timestamp: number;
};

// Reduced from 50 to limit memory usage
const MAX_HISTORY_SIZE = 30;

class UndoManager {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private current_state: UndoableState | null = null;

  /**
   * Initialize with the current state.
   */
  initialize(state: UndoableState): void {
    this.current_state = this.clone_state(state);
    this.past = [];
    this.future = [];
  }

  /**
   * Push current state to history before making a change.
   * Call this BEFORE modifying the state.
   */
  push(description: string): void {
    if (!this.current_state) return;

    this.past.push({
      state: this.clone_state(this.current_state),
      description,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.past.length > MAX_HISTORY_SIZE) {
      this.past.shift();
    }

    // Clear future on new action
    this.future = [];
  }

  /**
   * Update current state after a change.
   * Call this AFTER modifying the state.
   */
  update(state: UndoableState): void {
    this.current_state = this.clone_state(state);
  }

  /**
   * Undo the last action.
   * Returns the state to restore, or null if nothing to undo.
   */
  undo(): UndoableState | null {
    if (this.past.length === 0 || !this.current_state) return null;

    const entry = this.past.pop()!;

    // Save current state to future
    this.future.push({
      state: this.clone_state(this.current_state),
      description: "Redo",
      timestamp: Date.now(),
    });

    this.current_state = this.clone_state(entry.state);
    return entry.state;
  }

  /**
   * Redo the last undone action.
   * Returns the state to restore, or null if nothing to redo.
   */
  redo(): UndoableState | null {
    if (this.future.length === 0 || !this.current_state) return null;

    const entry = this.future.pop()!;

    // Save current state to past
    this.past.push({
      state: this.clone_state(this.current_state),
      description: "Undo",
      timestamp: Date.now(),
    });

    this.current_state = this.clone_state(entry.state);
    return entry.state;
  }

  /**
   * Check if undo is available.
   */
  can_undo(): boolean {
    return this.past.length > 0;
  }

  /**
   * Check if redo is available.
   */
  can_redo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Get undo stack size.
   */
  get_undo_count(): number {
    return this.past.length;
  }

  /**
   * Get redo stack size.
   */
  get_redo_count(): number {
    return this.future.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.past = [];
    this.future = [];
  }

  /**
   * Deep clone the state to prevent mutation.
   * Uses structuredClone for better performance than JSON.parse/stringify.
   */
  private clone_state(state: UndoableState): UndoableState {
    return structuredClone(state);
  }

  /**
   * Trim history to reduce memory usage.
   * Keeps only the most recent entries.
   */
  trim(keep_count: number = 10): void {
    if (this.past.length > keep_count) {
      this.past = this.past.slice(-keep_count);
    }
    // Clear future on trim to free memory
    this.future = [];
  }
}

// Singleton instance
export const undo_manager = new UndoManager();

// Export type for use in store
export type { UndoableState };
