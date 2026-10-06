/**
 * KEAOS Official Model Context Protocol (MCP) Tool Catalogs
 * 
 * Sourced directly from official OpenAPI / Swagger specifications and official
 * @modelcontextprotocol reference implementations (GitHub, Slack, Jira).
 * 
 * Provides comprehensive, categorized tool suites for enterprise agent workflows.
 */

export const GITHUB_OFFICIAL_ACTIONS = [
  // --- FILE ACTIONS (5) ---
  {
    name: 'create_file',
    displayName: 'Create a file',
    category: 'File Actions',
    type: 'write',
    description: 'Creates a new file in repository (PUT /repos/{owner}/{repo}/contents/{path}).'
  },
  {
    name: 'delete_file',
    displayName: 'Delete a file',
    category: 'File Actions',
    type: 'destructive',
    description: 'Deletes a file permanently from repository (DELETE /repos/{owner}/{repo}/contents/{path}).'
  },
  {
    name: 'update_file',
    displayName: 'Edit a file',
    category: 'File Actions',
    type: 'write',
    description: 'Updates and commits revisions to an existing file in the target repository.'
  },
  {
    name: 'read_file',
    displayName: 'Get a file',
    category: 'File Actions',
    type: 'read',
    description: 'Reads source file content directly from GitHub repository.'
  },
  {
    name: 'list_files',
    displayName: 'List files',
    category: 'File Actions',
    type: 'read',
    description: 'Lists all files and subdirectories in a repository path.'
  },

  // --- ISSUE ACTIONS (7) ---
  {
    name: 'create_issue',
    displayName: 'Create an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Creates an issue in the target repository (POST /repos/{owner}/{repo}/issues).'
  },
  {
    name: 'create_issue_comment',
    displayName: 'Create a comment on an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Adds a new discussion comment to an existing issue ticket.'
  },
  {
    name: 'edit_issue',
    displayName: 'Edit an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Updates an issue title, description, state (open/closed), or labels.'
  },
  {
    name: 'get_issue',
    displayName: 'Get an issue',
    category: 'Issue Actions',
    type: 'read',
    description: 'Retrieves complete issue metadata, comments count, and labels.'
  },
  {
    name: 'list_issues',
    displayName: 'List issues',
    category: 'Issue Actions',
    type: 'read',
    description: 'Queries active, closed, or assigned issues in the repository.'
  },
  {
    name: 'lock_issue',
    displayName: 'Lock an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Locks issue conversation to prevent further comments.'
  },
  {
    name: 'list_issue_comments',
    displayName: 'List comments on an issue',
    category: 'Issue Actions',
    type: 'read',
    description: 'Lists all comments posted to a specific issue.'
  },

  // --- ORGANIZATION & USER ACTIONS (6) ---
  {
    name: 'get_user_profile',
    displayName: 'Get user profile',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Retrieves authenticated user profile, avatar, followers, and public repo counts.'
  },
  {
    name: 'get_org_repositories',
    displayName: 'Get repositories for an organization',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Lists all repositories belonging to a specified GitHub organization.'
  },
  {
    name: 'list_org_members',
    displayName: 'List organization members',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Lists all public and private members in an organization.'
  },
  {
    name: 'list_collaborators',
    displayName: 'List repository collaborators',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Lists users with collaborator access permissions on the repository.'
  },
  {
    name: 'get_rate_limit',
    displayName: 'Get API rate limit status',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Queries remaining GitHub REST API calls, reset timestamp, and quotas.'
  },
  {
    name: 'list_user_organizations',
    displayName: 'List user organizations',
    category: 'Organization & User Actions',
    type: 'read',
    description: 'Lists all organizations the authenticated user belongs to.'
  },

  // --- REPOSITORY ACTIONS (8) ---
  {
    name: 'list_repositories',
    displayName: 'List repositories',
    category: 'Repository Actions',
    type: 'read',
    description: 'Lists all accessible GitHub repositories with visibility, branches, and URLs.'
  },
  {
    name: 'get_repository',
    displayName: 'Get repository details',
    category: 'Repository Actions',
    type: 'read',
    description: 'Retrieves detailed repository metadata, star count, forks, and default branch.'
  },
  {
    name: 'create_repository',
    displayName: 'Create a repository',
    category: 'Repository Actions',
    type: 'write',
    description: 'Creates a new repository for the authenticated user or organization.'
  },
  {
    name: 'fork_repository',
    displayName: 'Fork a repository',
    category: 'Repository Actions',
    type: 'write',
    description: 'Forks a target repository to current user namespace.'
  },
  {
    name: 'list_branches',
    displayName: 'List branches',
    category: 'Repository Actions',
    type: 'read',
    description: 'Lists all branches and protected status in the repository.'
  },
  {
    name: 'get_branch',
    displayName: 'Get branch details',
    category: 'Repository Actions',
    type: 'read',
    description: 'Retrieves commit SHA and protection rules for a specific branch.'
  },
  {
    name: 'list_commits',
    displayName: 'List commits',
    category: 'Repository Actions',
    type: 'read',
    description: 'Lists recent commit history, authors, commit messages, and SHAs.'
  },
  {
    name: 'star_repository',
    displayName: 'Star a repository',
    category: 'Repository Actions',
    type: 'write',
    description: 'Stars a repository for the authenticated user.'
  },

  // --- PULL REQUEST ACTIONS (6) ---
  {
    name: 'create_pull_request',
    displayName: 'Create a pull request',
    category: 'Pull Request Actions',
    type: 'write',
    description: 'Opens a pull request between feature branch and base branch.'
  },
  {
    name: 'get_pull_request',
    displayName: 'Get pull request details',
    category: 'Pull Request Actions',
    type: 'read',
    description: 'Retrieves pull request state, diff stats, mergeable status, and reviews.'
  },
  {
    name: 'list_pull_requests',
    displayName: 'List pull requests',
    category: 'Pull Request Actions',
    type: 'read',
    description: 'Lists active, merged, or closed pull requests in the repository.'
  },
  {
    name: 'merge_pull_request',
    displayName: 'Merge a pull request',
    category: 'Pull Request Actions',
    type: 'destructive',
    description: 'Merges an open pull request into base branch with commit message.'
  },
  {
    name: 'list_pull_request_files',
    displayName: 'List PR modified files',
    category: 'Pull Request Actions',
    type: 'read',
    description: 'Lists files changed, added, or deleted in a pull request.'
  },
  {
    name: 'create_pull_request_review',
    displayName: 'Submit PR review',
    category: 'Pull Request Actions',
    type: 'write',
    description: 'Submits approval, request-changes, or general comment on a pull request.'
  },

  // --- RELEASE & TAG ACTIONS (5) ---
  {
    name: 'list_releases',
    displayName: 'List releases',
    category: 'Release & Tag Actions',
    type: 'read',
    description: 'Lists published releases, tags, assets, and changelogs.'
  },
  {
    name: 'get_release',
    displayName: 'Get release details',
    category: 'Release & Tag Actions',
    type: 'read',
    description: 'Retrieves release notes and downloadable assets for a specific release ID or tag.'
  },
  {
    name: 'create_release',
    displayName: 'Create a release',
    category: 'Release & Tag Actions',
    type: 'write',
    description: 'Publishes a new version release with git tag and markdown release notes.'
  },
  {
    name: 'list_tags',
    displayName: 'List tags',
    category: 'Release & Tag Actions',
    type: 'read',
    description: 'Lists all git tags and associated commit SHAs.'
  },
  {
    name: 'get_tag',
    displayName: 'Get tag details',
    category: 'Release & Tag Actions',
    type: 'read',
    description: 'Retrieves commit and tagger info for a specific git tag.'
  }
];

export const SLACK_OFFICIAL_ACTIONS = [
  // --- CHANNEL ACTIONS (10) ---
  {
    name: 'join_slack_channel',
    displayName: 'Join a channel',
    category: 'Channel Actions',
    type: 'write',
    description: 'Joins an existing public Slack channel so the agent can post and receive updates.'
  },
  {
    name: 'leave_slack_channel',
    displayName: 'Leave a channel',
    category: 'Channel Actions',
    type: 'write',
    description: 'Leaves a specified Slack channel when conversation completes.'
  },
  {
    name: 'list_slack_channels',
    displayName: 'List channels',
    category: 'Channel Actions',
    type: 'read',
    description: 'Lists all public and accessible private channels in the workspace.'
  },
  {
    name: 'get_channel_info',
    displayName: 'Get channel details',
    category: 'Channel Actions',
    type: 'read',
    description: 'Retrieves topic, purpose, member count, and creation timestamp.'
  },
  {
    name: 'create_slack_channel',
    displayName: 'Create a channel',
    category: 'Channel Actions',
    type: 'write',
    description: 'Creates a new public or private Slack channel.'
  },
  {
    name: 'archive_slack_channel',
    displayName: 'Archive a channel',
    category: 'Channel Actions',
    type: 'destructive',
    description: 'Archives an existing Slack channel.'
  },
  {
    name: 'invite_to_channel',
    displayName: 'Invite user to channel',
    category: 'Channel Actions',
    type: 'write',
    description: 'Adds workspace users to a specified channel.'
  },
  {
    name: 'get_channel_history',
    displayName: 'Get conversation history',
    category: 'Channel Actions',
    type: 'read',
    description: 'Fetches recent conversation messages from a channel.'
  },
  {
    name: 'set_channel_topic',
    displayName: 'Set channel topic',
    category: 'Channel Actions',
    type: 'write',
    description: 'Updates the topic of a channel (e.g. current status, meeting summary, sprint goal).'
  },
  {
    name: 'set_channel_purpose',
    displayName: 'Set channel purpose',
    category: 'Channel Actions',
    type: 'write',
    description: 'Sets or updates the stated purpose/description of a Slack channel.'
  },

  // --- MESSAGE ACTIONS (9) ---
  {
    name: 'post_slack_message',
    displayName: 'Post a message',
    category: 'Message Actions',
    type: 'write',
    description: 'Sends a formatted markdown or block kit message to a Slack channel.'
  },
  {
    name: 'reply_to_thread',
    displayName: 'Reply to thread',
    category: 'Message Actions',
    type: 'write',
    description: 'Posts a response directly into an existing message thread without notifying the entire channel.'
  },
  {
    name: 'get_thread_replies',
    displayName: 'Get thread replies',
    category: 'Message Actions',
    type: 'read',
    description: 'Retrieves all conversation messages and replies from a specific thread.'
  },
  {
    name: 'update_slack_message',
    displayName: 'Update a message',
    category: 'Message Actions',
    type: 'write',
    description: 'Edits the text of an existing message in a Slack channel.'
  },
  {
    name: 'delete_slack_message',
    displayName: 'Delete a message',
    category: 'Message Actions',
    type: 'destructive',
    description: 'Permanently removes a message from a Slack channel.'
  },
  {
    name: 'get_slack_message_permalink',
    displayName: 'Get message permalink',
    category: 'Message Actions',
    type: 'read',
    description: 'Generates a permanent browser URL link to a specific message.'
  },
  {
    name: 'add_reaction',
    displayName: 'Add emoji reaction',
    category: 'Message Actions',
    type: 'write',
    description: 'Adds an emoji reaction to a message.'
  },
  {
    name: 'remove_reaction',
    displayName: 'Remove emoji reaction',
    category: 'Message Actions',
    type: 'write',
    description: 'Removes an emoji reaction from a message.'
  },
  {
    name: 'search_slack_messages',
    displayName: 'Search messages',
    category: 'Message Actions',
    type: 'read',
    description: 'Searches across channels and public history for messages matching a query.'
  },

  // --- DIRECT MESSAGES (2) ---
  {
    name: 'open_direct_message',
    displayName: 'Open direct message',
    category: 'Direct Messages',
    type: 'write',
    description: 'Opens or retrieves a 1-on-1 or multi-person DM conversation with target user IDs.'
  },
  {
    name: 'send_direct_message',
    displayName: 'Send direct message',
    category: 'Direct Messages',
    type: 'write',
    description: 'Sends a private DM alert or action item notification directly to a user.'
  },

  // --- PINS & REMINDERS (4) ---
  {
    name: 'pin_slack_message',
    displayName: 'Pin message to channel',
    category: 'Pins & Reminders',
    type: 'write',
    description: 'Pins an important announcement or meeting decision to the channel.'
  },
  {
    name: 'unpin_slack_message',
    displayName: 'Unpin message from channel',
    category: 'Pins & Reminders',
    type: 'write',
    description: 'Unpins a message from a Slack channel.'
  },
  {
    name: 'list_pinned_messages',
    displayName: 'List pinned messages',
    category: 'Pins & Reminders',
    type: 'read',
    description: 'Retrieves all messages currently pinned in a Slack channel.'
  },
  {
    name: 'create_slack_reminder',
    displayName: 'Create reminder',
    category: 'Pins & Reminders',
    type: 'write',
    description: 'Schedules a Slack reminder for a user or channel regarding task deadlines.'
  },

  // --- USER ACTIONS (3) ---
  {
    name: 'list_slack_users',
    displayName: 'List workspace users',
    category: 'User Actions',
    type: 'read',
    description: 'Lists all active members and bots in the Slack workspace.'
  },
  {
    name: 'get_user_profile',
    displayName: 'Get user profile',
    category: 'User Actions',
    type: 'read',
    description: 'Retrieves user display name, email, avatar, and title.'
  },
  {
    name: 'set_user_status',
    displayName: 'Set user status',
    category: 'User Actions',
    type: 'write',
    description: 'Updates custom status emoji and text.'
  },

  // --- FILE ACTIONS (2) ---
  {
    name: 'upload_slack_file',
    displayName: 'Upload file / snippet',
    category: 'File Actions',
    type: 'write',
    description: 'Uploads a document, image, or code snippet to a channel.'
  },
  {
    name: 'list_slack_files',
    displayName: 'List uploaded files',
    category: 'File Actions',
    type: 'read',
    description: 'Lists files shared in the workspace or specific channels.'
  }
];

export const JIRA_OFFICIAL_ACTIONS = [
  // --- ISSUE ACTIONS (7) ---
  {
    name: 'create_jira_issue',
    displayName: 'Create an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Creates a sprint ticket, task, story, or bug in Jira Cloud.'
  },
  {
    name: 'get_jira_issue',
    displayName: 'Get issue details',
    category: 'Issue Actions',
    type: 'read',
    description: 'Retrieves issue summary, status, assignee, priority, and custom fields.'
  },
  {
    name: 'update_jira_issue',
    displayName: 'Update an issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Modifies summary, description, priority, or field values.'
  },
  {
    name: 'delete_jira_issue',
    displayName: 'Delete an issue',
    category: 'Issue Actions',
    type: 'destructive',
    description: 'Permanently deletes an issue from Jira.'
  },
  {
    name: 'transition_jira_issue',
    displayName: 'Transition issue status',
    category: 'Issue Actions',
    type: 'write',
    description: 'Moves issue through workflow (e.g. In Progress, Review, Done).'
  },
  {
    name: 'assign_jira_issue',
    displayName: 'Assign issue',
    category: 'Issue Actions',
    type: 'write',
    description: 'Assigns issue ticket to a team member by account ID.'
  },
  {
    name: 'search_jira_issues',
    displayName: 'Search issues via JQL',
    category: 'Issue Actions',
    type: 'read',
    description: 'Performs flexible Jira Query Language (JQL) searches.'
  },

  // --- COMMENT ACTIONS (2) ---
  {
    name: 'add_issue_comment',
    displayName: 'Add comment to issue',
    category: 'Comment Actions',
    type: 'write',
    description: 'Posts a new comment on a Jira issue ticket.'
  },
  {
    name: 'get_issue_comments',
    displayName: 'Get issue comments',
    category: 'Comment Actions',
    type: 'read',
    description: 'Lists all discussion comments on a Jira issue.'
  },

  // --- PROJECT & SPRINT ACTIONS (4) ---
  {
    name: 'list_jira_projects',
    displayName: 'List projects',
    category: 'Project & Sprint Actions',
    type: 'read',
    description: 'Lists all accessible projects, keys, and project leads.'
  },
  {
    name: 'get_project_details',
    displayName: 'Get project details',
    category: 'Project & Sprint Actions',
    type: 'read',
    description: 'Retrieves project issue types, components, and versions.'
  },
  {
    name: 'list_project_versions',
    displayName: 'List release versions',
    category: 'Project & Sprint Actions',
    type: 'read',
    description: 'Lists release versions, release dates, and archived status.'
  },
  {
    name: 'list_active_sprints',
    displayName: 'List active sprints',
    category: 'Project & Sprint Actions',
    type: 'read',
    description: 'Lists currently active sprints on agile boards.'
  },

  // --- WORKLOG ACTIONS (2) ---
  {
    name: 'add_worklog',
    displayName: 'Log work time',
    category: 'Worklog Actions',
    type: 'write',
    description: 'Logs time spent (e.g., 2h 30m) on a Jira ticket.'
  },
  {
    name: 'get_worklogs',
    displayName: 'Get issue worklogs',
    category: 'Worklog Actions',
    type: 'read',
    description: 'Retrieves logged time entries on a specific issue.'
  }
];

export const GOOGLE_WORKSPACE_OFFICIAL_ACTIONS = [
  // Calendar Actions
  {
    name: 'list_calendar_events',
    displayName: 'List calendar events',
    category: 'Calendar Actions',
    type: 'read',
    description: 'Lists upcoming events from primary or specified Google Calendar.'
  },
  {
    name: 'create_calendar_event',
    displayName: 'Create calendar event',
    category: 'Calendar Actions',
    type: 'write',
    description: 'Schedules a new meeting or event with attendees and Google Meet link.'
  },
  {
    name: 'update_calendar_event',
    displayName: 'Update calendar event',
    category: 'Calendar Actions',
    type: 'write',
    description: 'Updates meeting details, times, attendees, or agenda.'
  },
  {
    name: 'delete_calendar_event',
    displayName: 'Delete calendar event',
    category: 'Calendar Actions',
    type: 'destructive',
    description: 'Cancels and removes a scheduled meeting from Google Calendar.'
  },
  // Drive Actions
  {
    name: 'list_drive_files',
    displayName: 'List Google Drive files',
    category: 'Drive Actions',
    type: 'read',
    description: 'Searches and lists documents, spreadsheets, and files in Drive.'
  },
  {
    name: 'get_drive_file_metadata',
    displayName: 'Get file metadata',
    category: 'Drive Actions',
    type: 'read',
    description: 'Retrieves ownership, permissions, and sharing status of a Drive file.'
  },
  {
    name: 'upload_drive_file',
    displayName: 'Upload file to Drive',
    category: 'Drive Actions',
    type: 'write',
    description: 'Uploads documents or reports to Google Drive folder.'
  },
  {
    name: 'delete_drive_file',
    displayName: 'Delete Drive file',
    category: 'Drive Actions',
    type: 'destructive',
    description: 'Moves a file or document to Google Drive trash.'
  },
  // Gmail Actions
  {
    name: 'list_emails',
    displayName: 'Search & list emails',
    category: 'Gmail Actions',
    type: 'read',
    description: 'Queries inbox for emails matching sender, subject, or label.'
  },
  {
    name: 'send_email',
    displayName: 'Send email via Gmail',
    category: 'Gmail Actions',
    type: 'write',
    description: 'Sends automated executive recaps or notifications to recipients.'
  },
  {
    name: 'create_draft_email',
    displayName: 'Create email draft',
    category: 'Gmail Actions',
    type: 'write',
    description: 'Prepares an email draft in Gmail without immediate sending.'
  },
  // Docs & Sheets Actions
  {
    name: 'read_google_doc',
    displayName: 'Read Google Doc',
    category: 'Document Actions',
    type: 'read',
    description: 'Extracts formatted text and headings from a Google Document.'
  },
  {
    name: 'append_to_google_doc',
    displayName: 'Append to Google Doc',
    category: 'Document Actions',
    type: 'write',
    description: 'Appends summary sections or meeting minutes to an existing Google Doc.'
  },
  {
    name: 'read_sheet_rows',
    displayName: 'Read Spreadsheet rows',
    category: 'Sheets Actions',
    type: 'read',
    description: 'Queries rows and tabular data from a Google Sheet.'
  },
  {
    name: 'append_sheet_row',
    displayName: 'Append row to Sheet',
    category: 'Sheets Actions',
    type: 'write',
    description: 'Appends structured metrics, action items, or audit records to Sheet.'
  }
];

/**
 * Universal Authentication Specifications for All MCP Servers
 */
export const MCP_AUTH_SPECS = {
  github: {
    id: 'github',
    name: 'GitHub',
    supportedModes: ['token', 'oauth'],
    defaultMode: 'oauth',
    oauthProviderName: 'GitHub OAuth 2.0',
    scopes: ['repo', 'user', 'read:org', 'workflow'],
    scopeDescription: 'Pre-authorizes all 37 repository, issue, commit, and branch tools.',
    totalDefaultTools: GITHUB_OFFICIAL_ACTIONS.length
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    supportedModes: ['token', 'oauth'],
    defaultMode: 'oauth',
    oauthProviderName: 'Slack OAuth 2.0',
    scopes: ['chat:write', 'channels:read', 'channels:history', 'users:read', 'files:write'],
    scopeDescription: 'Pre-authorizes all 22 channel, messaging, pin, and upload tools.',
    totalDefaultTools: SLACK_OFFICIAL_ACTIONS.length
  },
  jira: {
    id: 'jira',
    name: 'Atlassian Jira',
    supportedModes: ['token', 'oauth'],
    defaultMode: 'oauth',
    oauthProviderName: 'Atlassian OAuth 2.0 (3LO)',
    scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user', 'offline_access'],
    scopeDescription: 'Pre-authorizes all 18 sprint, issue, transition, and worklog tools.',
    totalDefaultTools: JIRA_OFFICIAL_ACTIONS.length
  },
  google: {
    id: 'google',
    name: 'Google Workspace',
    supportedModes: ['token', 'oauth'],
    defaultMode: 'oauth',
    oauthProviderName: 'Google Identity OAuth 2.0',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/documents'
    ],
    scopeDescription: 'Pre-authorizes all 15 Calendar, Drive, Gmail, Docs, and Sheets tools.',
    totalDefaultTools: GOOGLE_WORKSPACE_OFFICIAL_ACTIONS.length
  }
};

/**
 * Returns the standardized official action catalog for a named service.
 */
export function getOfficialMcpTools(serviceName = '') {
  const norm = (serviceName || '').toLowerCase().trim();
  if (norm.includes('github')) return GITHUB_OFFICIAL_ACTIONS;
  if (norm.includes('slack')) return SLACK_OFFICIAL_ACTIONS;
  if (norm.includes('jira')) return JIRA_OFFICIAL_ACTIONS;
  if (norm.includes('google')) return GOOGLE_WORKSPACE_OFFICIAL_ACTIONS;
  return [];
}

/**
 * Extracts and maps tools from an arbitrary OpenAPI 3.0 / Swagger JSON specification.
 * Used when adding an external service via doc link or OpenAPI endpoint.
 */
export function extractToolsFromOpenApiSpec(spec) {
  if (!spec || !spec.paths) return [];
  const tools = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        const operationId = op.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const category = (op.tags && op.tags[0]) ? `${op.tags[0]} Actions` : 'General Actions';
        const type = method.toLowerCase() === 'get' ? 'read' : (method.toLowerCase() === 'delete' ? 'destructive' : 'write');

        tools.push({
          name: operationId,
          displayName: op.summary || operationId,
          category,
          type,
          description: op.description || op.summary || `${method.toUpperCase()} ${path}`,
          endpointPath: path,
          httpMethod: method.toUpperCase()
        });
      }
    }
  }

  return tools;
}

/**
 * Groups an array of tools into categories.
 */
export function groupToolsByCategory(tools = []) {
  const groups = {};
  for (const tool of tools) {
    const cat = tool.category || 'General Actions';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tool);
  }
  return groups;
}
