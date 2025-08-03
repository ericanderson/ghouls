/**
 * Enhanced prompts for handling large datasets with pagination, search, and bulk operations
 */

import inquirer from "inquirer";

export interface EnhancedChoice {
  name: string;
  value: string;
  checked?: boolean;
  metadata?: {
    prNumber?: number;
    lastCommit?: string;
    safetyReason?: string;
  };
}

export interface PaginatedPromptOptions {
  message: string;
  choices: EnhancedChoice[];
  pageSize?: number;
  searchEnabled?: boolean;
  bulkActionsEnabled?: boolean;
}

export interface BulkAction {
  name: string;
  value: 'select-all' | 'select-none' | 'select-pattern' | 'continue';
  description: string;
}

/**
 * Creates a paginated checkbox prompt with search and bulk actions for large datasets
 */
export async function createPaginatedCheckboxPrompt(
  options: PaginatedPromptOptions
): Promise<string[]> {
  const { choices, message, pageSize = 15, bulkActionsEnabled = true } = options;
  
  // If dataset is small, use regular checkbox
  if (choices.length <= pageSize) {
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message,
        choices: choices.map(choice => ({
          name: choice.name,
          value: choice.value,
          checked: choice.checked
        })),
        pageSize
      }
    ]);
    return selected;
  }

  console.log(`\nFound ${choices.length} items. Using enhanced selection mode for large datasets.`);
  
  let selectedItems: Set<string> = new Set();
  let filteredChoices = [...choices];
  let searchTerm = '';
  
  // Set initial selections based on checked status
  choices.forEach(choice => {
    if (choice.checked) {
      selectedItems.add(choice.value);
    }
  });

  while (true) {
    // Show current stats
    const stats = getSelectionStats(choices, selectedItems);
    console.log(`\nCurrent selection: ${stats.selected}/${stats.total} items`);
    if (searchTerm) {
      console.log(`Search filter: "${searchTerm}" (${filteredChoices.length} matches)`);
    }

    // Main action menu
    const actions: Array<{ name: string; value: string }> = [
      { name: `📋 Review selected items (${stats.selected})`, value: 'review' },
      { name: '✅ Continue with current selection', value: 'continue' }
    ];

    if (bulkActionsEnabled) {
      actions.unshift(
        { name: '🔍 Search/filter items', value: 'search' },
        { name: '📦 Bulk actions', value: 'bulk' },
        { name: '✏️  Individual selection', value: 'individual' }
      );
    } else {
      actions.unshift({ name: '✏️  Individual selection', value: 'individual' });
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: actions,
        pageSize: 10
      }
    ]);

    switch (action) {
      case 'search':
        const result = await handleSearchAction(choices, searchTerm);
        searchTerm = result.searchTerm;
        filteredChoices = result.filteredChoices;
        break;

      case 'bulk':
        selectedItems = await handleBulkActions(filteredChoices, selectedItems);
        break;

      case 'individual':
        selectedItems = await handleIndividualSelection(filteredChoices, selectedItems, pageSize);
        break;

      case 'review':
        await reviewSelectedItems(choices, selectedItems);
        break;

      case 'continue':
        return Array.from(selectedItems);
    }
  }
}

async function handleSearchAction(
  allChoices: EnhancedChoice[], 
  currentSearchTerm: string
): Promise<{ searchTerm: string; filteredChoices: EnhancedChoice[] }> {
  const { searchTerm } = await inquirer.prompt([
    {
      type: 'input',
      name: 'searchTerm',
      message: 'Enter search term (branch name pattern):',
      default: currentSearchTerm
    }
  ]);

  const filteredChoices = searchTerm.trim() 
    ? allChoices.filter(choice => 
        choice.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        choice.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allChoices;

  console.log(`Found ${filteredChoices.length} matches for "${searchTerm}"`);
  
  return { searchTerm, filteredChoices };
}

async function handleBulkActions(
  choices: EnhancedChoice[], 
  selectedItems: Set<string>
): Promise<Set<string>> {
  const bulkActions: BulkAction[] = [
    { 
      name: `Select all filtered items (${choices.length})`, 
      value: 'select-all',
      description: 'Select all currently visible items'
    },
    { 
      name: `Deselect all items`, 
      value: 'select-none',
      description: 'Clear all selections'
    },
    { 
      name: 'Select by pattern', 
      value: 'select-pattern',
      description: 'Select items matching a regex pattern'
    }
  ];

  const { bulkAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'bulkAction',
      message: 'Choose bulk action:',
      choices: bulkActions.map(action => ({
        name: `${action.name} - ${action.description}`,
        value: action.value
      }))
    }
  ]);

  switch (bulkAction) {
    case 'select-all':
      choices.forEach(choice => selectedItems.add(choice.value));
      console.log(`Selected ${choices.length} items`);
      break;

    case 'select-none':
      selectedItems.clear();
      console.log('Cleared all selections');
      break;

    case 'select-pattern':
      const { pattern } = await inquirer.prompt([
        {
          type: 'input',
          name: 'pattern',
          message: 'Enter regex pattern (e.g., "^feature/", ".*-old$"):',
          validate: (input: string) => {
            try {
              new RegExp(input);
              return true;
            } catch {
              return 'Please enter a valid regex pattern';
            }
          }
        }
      ]);

      try {
        const regex = new RegExp(pattern);
        let matchCount = 0;
        choices.forEach(choice => {
          if (regex.test(choice.value)) {
            selectedItems.add(choice.value);
            matchCount++;
          }
        });
        console.log(`Selected ${matchCount} items matching pattern "${pattern}"`);
      } catch (error) {
        console.log('Invalid pattern, no items selected');
      }
      break;
  }

  return selectedItems;
}

async function handleIndividualSelection(
  choices: EnhancedChoice[], 
  selectedItems: Set<string>,
  pageSize: number
): Promise<Set<string>> {
  const choicesWithSelection = choices.map(choice => ({
    name: choice.name,
    value: choice.value,
    checked: selectedItems.has(choice.value)
  }));

  const { newSelections } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'newSelections',
      message: `Select/deselect items (${choices.length} total):`,
      choices: choicesWithSelection,
      pageSize
    }
  ]);

  return new Set(newSelections);
}

async function reviewSelectedItems(
  allChoices: EnhancedChoice[], 
  selectedItems: Set<string>
): Promise<void> {
  const selectedChoices = allChoices.filter(choice => selectedItems.has(choice.value));
  
  if (selectedChoices.length === 0) {
    console.log('\nNo items currently selected.');
    return;
  }

  console.log(`\nSelected items (${selectedChoices.length}):`);
  selectedChoices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice.name}`);
  });

  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }
  ]);
}

function getSelectionStats(
  allChoices: EnhancedChoice[], 
  selectedItems: Set<string>
): { selected: number; total: number } {
  return {
    selected: selectedItems.size,
    total: allChoices.length
  };
}