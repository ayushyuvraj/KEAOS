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
 * Official Neo4j Model Context Protocol (MCP) Actions Catalog
 * Sourced from official @neo4j/mcp specification, neo4j-mcp-server, and Cypher transaction protocols.
 * Supports Local Neo4j, Neo4j AuraDB Cloud, and Standalone neo4j-mcp-server.
 */
export const NEO4J_OFFICIAL_ACTIONS = [
  // --- GRAPH SCHEMA ACTIONS ---
  {
    name: 'get-schema',
    displayName: 'Introspect Graph Schema',
    category: 'Graph Schema Actions',
    type: 'read',
    description: 'Inspects and returns database schema structure including node labels, relationship types, and property keys to ground agent reasoning.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  // --- CYPHER QUERY ACTIONS ---
  {
    name: 'read-cypher',
    displayName: 'Execute Read Cypher Query',
    category: 'Cypher Query Actions',
    type: 'read',
    description: 'Executes read-only Cypher queries (MATCH, RETURN, WITH) verified via EXPLAIN and query classification against the target database.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The read-only Cypher query to execute' },
        params: { type: 'object', description: 'Optional key-value query parameters' }
      },
      required: ['query']
    }
  },
  {
    name: 'write-cypher',
    displayName: 'Execute Write Cypher Query',
    category: 'Cypher Query Actions',
    type: 'destructive',
    description: 'Executes data-mutating Cypher statements (CREATE, MERGE, SET, DELETE, REMOVE). Can be blocked at the Gateway with zero-trust egress rules.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The write-enabled Cypher query to execute' },
        params: { type: 'object', description: 'Optional key-value query parameters' }
      },
      required: ['query']
    }
  },

  // --- GRAPH DATA SCIENCE (GDS) ---
  {
    name: 'list-gds-procedures',
    displayName: 'List GDS Library Procedures',
    category: 'Graph Data Science (GDS)',
    type: 'read',
    description: 'Queries available Neo4j Graph Data Science (GDS) procedures and algorithms (PageRank, Louvain, Betweenness, Node2Vec, Community Detection).',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Optional procedure prefix or algorithm name filter' }
      }
    }
  },

  // --- GRAPH TRAVERSAL ACTIONS ---
  {
    name: 'get-neighbors',
    displayName: 'Query Node Neighbors & Subgraph',
    category: 'Graph Traversal Actions',
    type: 'read',
    description: 'Retrieves connected neighboring nodes, relationship types, and multi-hop paths for a specified entity identifier or label.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The identifier or property value of the target node' },
        label: { type: 'string', description: 'Node label to filter on (e.g. Person, Service, Transaction)' },
        depth: { type: 'number', description: 'Traversal depth (1 or 2 hops, default: 1)' },
        relationshipType: { type: 'string', description: 'Optional relationship type filter' }
      },
      required: ['nodeId']
    }
  },

  // --- GRAPH ENTITY ACTIONS ---
  {
    name: 'create-node',
    displayName: 'Create Graph Entity Node',
    category: 'Graph Entity Actions',
    type: 'write',
    description: 'Inserts a new typed entity node with key-value properties and labels into the active Neo4j graph store.',
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Target node label (e.g., Entity, Company, User)' },
        properties: { type: 'object', description: 'Key-value attributes to store on the node' }
      },
      required: ['label', 'properties']
    }
  },
  {
    name: 'create-relationship',
    displayName: 'Create Relationship Edge',
    category: 'Graph Entity Actions',
    type: 'write',
    description: 'Creates a directed typed relationship between two existing graph nodes with optional edge properties.',
    parameters: {
      type: 'object',
      properties: {
        fromNodeId: { type: 'string', description: 'Identifier of the source node' },
        toNodeId: { type: 'string', description: 'Identifier of the target node' },
        relationshipType: { type: 'string', description: 'Directed relationship type name (e.g., BELONGS_TO, DEPENDS_ON)' },
        properties: { type: 'object', description: 'Optional relationship edge properties' }
      },
      required: ['fromNodeId', 'toNodeId', 'relationshipType']
    }
  }
];

export const OUTLOOK_OFFICIAL_ACTIONS = [
  // --- MAIL OPERATIONS (12) ---
  {
    name: 'list_messages',
    displayName: 'List Emails',
    category: 'Mail Operations',
    type: 'read',
    description: 'Lists messages from the user mailbox or a specific folder (GET /me/messages).',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Folder name or ID (e.g., inbox, drafts, sentitems, archive)' },
        limit: { type: 'number', description: 'Maximum number of messages to return (default: 10, max: 50)' },
        filter: { type: 'string', description: 'OData filter query (e.g., isRead eq false or from/emailAddress/address eq \'exec@corp.com\')' },
        search: { type: 'string', description: 'KQL search keyword across subject, body, or sender' }
      }
    }
  },
  {
    name: 'get_message',
    displayName: 'Get Email Details',
    category: 'Mail Operations',
    type: 'read',
    description: 'Retrieves complete message content, HTML body, internet headers, and recipient arrays (GET /me/messages/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The unique Microsoft Graph ID of the message' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'search_messages',
    displayName: 'Search Emails',
    category: 'Mail Operations',
    type: 'read',
    description: 'Executes full-text keyword search across email subjects, sender addresses, and body text.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword to search for' },
        limit: { type: 'number', description: 'Maximum search results to return (default: 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'send_mail',
    displayName: 'Send Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Sends a new email message to recipients (POST /me/sendMail).',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'array', items: { type: 'string' }, description: 'List of recipient email addresses' },
        cc: { type: 'array', items: { type: 'string' }, description: 'Optional CC recipient email addresses' },
        bcc: { type: 'array', items: { type: 'string' }, description: 'Optional BCC recipient email addresses' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text or HTML content' },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Importance priority level' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'create_draft',
    displayName: 'Create Draft Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Composes a new draft message in the Drafts folder without sending (POST /me/messages).',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses' },
        subject: { type: 'string', description: 'Draft subject line' },
        body: { type: 'string', description: 'Draft body content' }
      },
      required: ['subject', 'body']
    }
  },
  {
    name: 'update_draft',
    displayName: 'Update Draft Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Modifies subject, body, or recipients of an existing unsent draft message (PATCH /me/messages/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The draft message ID to update' },
        to: { type: 'array', items: { type: 'string' }, description: 'Updated recipient list' },
        subject: { type: 'string', description: 'Updated subject line' },
        body: { type: 'string', description: 'Updated body content' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'send_draft',
    displayName: 'Send Draft Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Dispatches an existing draft message to its specified recipients (POST /me/messages/{id}/send).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The draft message ID to send' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'reply_mail',
    displayName: 'Reply to Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Sends a reply message to the original sender of an email (POST /me/messages/{id}/reply).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID being replied to' },
        comment: { type: 'string', description: 'Reply text message to send' }
      },
      required: ['messageId', 'comment']
    }
  },
  {
    name: 'reply_all_mail',
    displayName: 'Reply All to Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Sends a reply to all recipients and the sender of an email thread (POST /me/messages/{id}/replyAll).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID being replied to' },
        comment: { type: 'string', description: 'Reply text message to send to all recipients' }
      },
      required: ['messageId', 'comment']
    }
  },
  {
    name: 'forward_mail',
    displayName: 'Forward Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Forwards an email to specified recipients with optional forwarding commentary (POST /me/messages/{id}/forward).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID to forward' },
        to: { type: 'array', items: { type: 'string' }, description: 'Recipient email addresses to forward to' },
        comment: { type: 'string', description: 'Optional forward message body commentary' }
      },
      required: ['messageId', 'to']
    }
  },
  {
    name: 'delete_message',
    displayName: 'Delete Email',
    category: 'Mail Operations',
    type: 'destructive',
    description: 'Permanently deletes an email message or moves it to Deleted Items (DELETE /me/messages/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID to delete' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'move_message',
    displayName: 'Move Email',
    category: 'Mail Operations',
    type: 'write',
    description: 'Moves an email message to a specified destination mail folder (POST /me/messages/{id}/move).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID to move' },
        destinationId: { type: 'string', description: 'Destination folder ID or well-known name (e.g., archive, junkemail)' }
      },
      required: ['messageId', 'destinationId']
    }
  },

  // --- MAIL FOLDERS & ATTACHMENTS (4) ---
  {
    name: 'list_mail_folders',
    displayName: 'List Mail Folders',
    category: 'Folders & Attachments',
    type: 'read',
    description: 'Lists all mail folders in the user mailbox (GET /me/mailFolders).',
    inputSchema: {
      type: 'object',
      properties: {
        includeHidden: { type: 'boolean', description: 'Whether to include system or hidden folders' }
      }
    }
  },
  {
    name: 'create_mail_folder',
    displayName: 'Create Mail Folder',
    category: 'Folders & Attachments',
    type: 'write',
    description: 'Creates a new mail folder under root or a parent folder (POST /me/mailFolders).',
    inputSchema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', description: 'Name of the new folder' },
        parentFolderId: { type: 'string', description: 'Optional parent folder ID to create subfolder under' }
      },
      required: ['displayName']
    }
  },
  {
    name: 'list_message_attachments',
    displayName: 'List Attachments',
    category: 'Folders & Attachments',
    type: 'read',
    description: 'Retrieves all file attachments and metadata for a specific message (GET /me/messages/{id}/attachments).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The message ID to fetch attachments from' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'add_message_attachment',
    displayName: 'Add Attachment',
    category: 'Folders & Attachments',
    type: 'write',
    description: 'Attaches a file to a draft message (POST /me/messages/{id}/attachments).',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'The draft message ID' },
        name: { type: 'string', description: 'Filename of the attachment' },
        contentType: { type: 'string', description: 'MIME type of the file (e.g., application/pdf)' },
        contentBytes: { type: 'string', description: 'Base64-encoded file content' }
      },
      required: ['messageId', 'name', 'contentBytes']
    }
  },

  // --- CALENDAR & SCHEDULING (10) ---
  {
    name: 'list_events',
    displayName: 'List Calendar Events',
    category: 'Calendar & Scheduling',
    type: 'read',
    description: 'Lists upcoming calendar events from the default calendar (GET /me/events).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum events to return (default: 10)' },
        filter: { type: 'string', description: 'OData filter query' }
      }
    }
  },
  {
    name: 'get_calendar_view',
    displayName: 'Get Calendar Schedule',
    category: 'Calendar & Scheduling',
    type: 'read',
    description: 'Retrieves occurrences of events within a specific time window (GET /me/calendarView).',
    inputSchema: {
      type: 'object',
      properties: {
        startDateTime: { type: 'string', description: 'Start time ISO string (e.g., 2026-10-09T08:00:00Z)' },
        endDateTime: { type: 'string', description: 'End time ISO string (e.g., 2026-10-09T18:00:00Z)' }
      },
      required: ['startDateTime', 'endDateTime']
    }
  },
  {
    name: 'get_event',
    displayName: 'Get Event Details',
    category: 'Calendar & Scheduling',
    type: 'read',
    description: 'Retrieves complete event metadata, location, attendees, and Teams meeting links (GET /me/events/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The unique Microsoft Graph ID of the event' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'create_event',
    displayName: 'Schedule Event',
    category: 'Calendar & Scheduling',
    type: 'write',
    description: 'Schedules a calendar event with attendees, agenda, and optional online Teams meeting (POST /me/events).',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Event title / meeting subject' },
        start: { type: 'string', description: 'Start time ISO string (e.g., 2026-10-10T14:00:00)' },
        end: { type: 'string', description: 'End time ISO string (e.g., 2026-10-10T15:00:00)' },
        timeZone: { type: 'string', description: 'Time zone identifier (default: UTC)' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee email addresses' },
        body: { type: 'string', description: 'Meeting description / agenda notes' },
        location: { type: 'string', description: 'Physical meeting location or room' },
        isOnlineMeeting: { type: 'boolean', description: 'Whether to generate a Microsoft Teams online meeting link' }
      },
      required: ['subject', 'start', 'end']
    }
  },
  {
    name: 'update_event',
    displayName: 'Update Event',
    category: 'Calendar & Scheduling',
    type: 'write',
    description: 'Modifies timing, attendees, location, or agenda of an existing event (PATCH /me/events/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to update' },
        subject: { type: 'string', description: 'Updated subject' },
        start: { type: 'string', description: 'Updated start time ISO string' },
        end: { type: 'string', description: 'Updated end time ISO string' },
        body: { type: 'string', description: 'Updated agenda notes' },
        location: { type: 'string', description: 'Updated location' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete_event',
    displayName: 'Cancel / Delete Event',
    category: 'Calendar & Scheduling',
    type: 'destructive',
    description: 'Cancels a meeting and removes it from the calendar (DELETE /me/events/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to cancel / delete' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'accept_event',
    displayName: 'Accept Meeting',
    category: 'Calendar & Scheduling',
    type: 'write',
    description: 'Formally accepts a calendar meeting invitation (POST /me/events/{id}/accept).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to accept' },
        comment: { type: 'string', description: 'Optional acceptance response message' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'decline_event',
    displayName: 'Decline Meeting',
    category: 'Calendar & Scheduling',
    type: 'write',
    description: 'Declines a calendar meeting invitation (POST /me/events/{id}/decline).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to decline' },
        comment: { type: 'string', description: 'Optional decline reasoning comment' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'tentatively_accept_event',
    displayName: 'Tentative Accept Meeting',
    category: 'Calendar & Scheduling',
    type: 'write',
    description: 'Tentatively accepts a calendar meeting invitation (POST /me/events/{id}/tentativelyAccept).',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to tentatively accept' },
        comment: { type: 'string', description: 'Optional comment' }
      },
      required: ['eventId']
    }
  },
  {
    name: 'find_meeting_times',
    displayName: 'Find Optimal Meeting Times',
    category: 'Calendar & Scheduling',
    type: 'read',
    description: 'Checks free/busy availability of requested attendees and suggests optimal meeting slots (POST /me/findMeetingTimes).',
    inputSchema: {
      type: 'object',
      properties: {
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses to coordinate' },
        meetingDurationMinutes: { type: 'number', description: 'Duration of the proposed meeting in minutes (default: 30)' },
        startWindow: { type: 'string', description: 'Start boundary ISO string' },
        endWindow: { type: 'string', description: 'End boundary ISO string' }
      },
      required: ['attendees']
    }
  },

  // --- CONTACTS & PEOPLE (5) ---
  {
    name: 'list_contacts',
    displayName: 'List Contacts',
    category: 'Contacts & People',
    type: 'read',
    description: 'Lists contacts from the user personal address book (GET /me/contacts).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum contacts to return (default: 20)' },
        filter: { type: 'string', description: 'OData filter expression' }
      }
    }
  },
  {
    name: 'get_contact',
    displayName: 'Get Contact Details',
    category: 'Contacts & People',
    type: 'read',
    description: 'Retrieves complete profile, emails, phones, and job title of a contact (GET /me/contacts/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The unique contact ID' }
      },
      required: ['contactId']
    }
  },
  {
    name: 'create_contact',
    displayName: 'Create Contact',
    category: 'Contacts & People',
    type: 'write',
    description: 'Adds a new person to the address book (POST /me/contacts).',
    inputSchema: {
      type: 'object',
      properties: {
        givenName: { type: 'string', description: 'First name' },
        surname: { type: 'string', description: 'Last name' },
        emailAddress: { type: 'string', description: 'Primary email address' },
        companyName: { type: 'string', description: 'Company or organization' },
        jobTitle: { type: 'string', description: 'Job title' },
        mobilePhone: { type: 'string', description: 'Mobile phone number' }
      },
      required: ['givenName', 'emailAddress']
    }
  },
  {
    name: 'update_contact',
    displayName: 'Update Contact',
    category: 'Contacts & People',
    type: 'write',
    description: 'Updates information for an existing contact (PATCH /me/contacts/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The contact ID to update' },
        givenName: { type: 'string', description: 'Updated first name' },
        surname: { type: 'string', description: 'Updated last name' },
        emailAddress: { type: 'string', description: 'Updated email address' },
        companyName: { type: 'string', description: 'Updated company' },
        jobTitle: { type: 'string', description: 'Updated title' }
      },
      required: ['contactId']
    }
  },
  {
    name: 'delete_contact',
    displayName: 'Delete Contact',
    category: 'Contacts & People',
    type: 'destructive',
    description: 'Removes a contact from personal address book (DELETE /me/contacts/{id}).',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The contact ID to remove' }
      },
      required: ['contactId']
    }
  },

  // --- TASKS & MICROSOFT TO DO (5) ---
  {
    name: 'list_todo_lists',
    displayName: 'List To Do Lists',
    category: 'Tasks & To Do',
    type: 'read',
    description: 'Enumerates Microsoft To Do task lists and folders (GET /me/todo/lists).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_tasks',
    displayName: 'List Tasks',
    category: 'Tasks & To Do',
    type: 'read',
    description: 'Lists tasks within a specific To Do list (GET /me/todo/lists/{id}/tasks).',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'The To Do list ID (or default list if omitted)' },
        status: { type: 'string', enum: ['notStarted', 'inProgress', 'completed'], description: 'Filter tasks by status' }
      }
    }
  },
  {
    name: 'create_task',
    displayName: 'Create Task',
    category: 'Tasks & To Do',
    type: 'write',
    description: 'Creates a new task in Microsoft To Do (POST /me/todo/lists/{id}/tasks).',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'Optional list ID (uses default task list if omitted)' },
        title: { type: 'string', description: 'Task title / description' },
        dueDateTime: { type: 'string', description: 'Due date ISO string (e.g., 2026-10-15T18:00:00Z)' },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Task importance' },
        body: { type: 'string', description: 'Task notes or checklist details' }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    displayName: 'Update Task',
    category: 'Tasks & To Do',
    type: 'write',
    description: 'Updates task title, completion status, or due date (PATCH /me/todo/lists/{id}/tasks/{taskId}).',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'The list ID containing the task' },
        taskId: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string', description: 'Updated title' },
        status: { type: 'string', enum: ['notStarted', 'inProgress', 'completed'], description: 'Updated status' },
        dueDateTime: { type: 'string', description: 'Updated due date ISO string' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'delete_task',
    displayName: 'Delete Task',
    category: 'Tasks & To Do',
    type: 'destructive',
    description: 'Permanently deletes a task from Microsoft To Do (DELETE /me/todo/lists/{id}/tasks/{taskId}).',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string', description: 'The list ID containing the task' },
        taskId: { type: 'string', description: 'The task ID to remove' }
      },
      required: ['taskId']
    }
  },

  // --- MAILBOX RULES & SETTINGS (2) ---
  {
    name: 'list_message_rules',
    displayName: 'List Inbox Rules',
    category: 'Mailbox Settings',
    type: 'read',
    description: 'Lists automated inbox sorting, forwarding, and categorization rules (GET /me/mailFolders/inbox/messageRules).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_mailbox_settings',
    displayName: 'Get Mailbox Settings',
    category: 'Mailbox Settings',
    type: 'read',
    description: 'Inspects user timezone, working hours, language, and automatic Out-of-Office (OOO) status (GET /me/mailboxSettings).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Universal Authentication Specifications for All MCP Servers
 */
export const MCP_AUTH_SPECS = {
  outlook: {
    id: 'outlook',
    name: 'Microsoft Outlook',
    supportedModes: ['token', 'oauth'],
    defaultMode: 'oauth',
    oauthProviderName: 'Microsoft Entra ID (Azure AD) OAuth 2.0',
    scopes: [
      'Mail.Read',
      'Mail.ReadWrite',
      'Mail.Send',
      'Calendars.Read',
      'Calendars.ReadWrite',
      'Contacts.Read',
      'Contacts.ReadWrite',
      'Tasks.ReadWrite',
      'MailboxSettings.Read',
      'User.Read',
      'offline_access'
    ],
    scopeDescription: 'Pre-authorizes all 38 Outlook Mail, Calendar, Contacts, Tasks, and Settings tools.',
    totalDefaultTools: OUTLOOK_OFFICIAL_ACTIONS.length
  },
  neo4j: {
    id: 'neo4j',
    name: 'Neo4j Graph Database',
    supportedModes: ['credentials', 'endpoint'],
    defaultMode: 'credentials',
    oauthProviderName: 'Neo4j Bolt / AuraDB / MCP Gateway',
    scopes: ['get-schema', 'read-cypher', 'write-cypher', 'list-gds-procedures', 'get-neighbors', 'create-node', 'create-relationship'],
    scopeDescription: 'Pre-authorizes all 7 Neo4j graph schema, Cypher query, GDS, and knowledge graph tools.',
    totalDefaultTools: NEO4J_OFFICIAL_ACTIONS.length
  },
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
 * Unambiguously identifies the external MCP service (outlook, slack, github, jira, google, neo4j)
 * from any combination of properties, names, IDs, endpoints, or descriptors.
 */
export function identifyMcpService(obj = {}, fallbackId = '') {
  if (!obj && !fallbackId) return '';
  const str = typeof obj === 'string' ? obj : '';
  const target = typeof obj === 'object' && obj !== null ? obj : {};
  const combined = `${str} ${target.serviceName || ''} ${target.name || ''} ${target.displayName || ''} ${target.title || ''} ${target.transport || ''} ${target.basis?.provider || ''} ${target.endpoint || ''} ${target.serverUrl || ''} ${target.id || ''} ${fallbackId || ''}`.toLowerCase();
  
  if (combined.includes('outlook') || combined.includes('graph.microsoft') || combined.includes('office365') || combined.includes('microsoft')) return 'outlook';
  if (combined.includes('neo4j') || combined.includes('cypher') || combined.includes('bolt') || combined.includes('auradb')) return 'neo4j';
  if (combined.includes('slack')) return 'slack';
  if (combined.includes('github')) return 'github';
  if (combined.includes('jira')) return 'jira';
  if (combined.includes('google')) return 'google';
  return '';
}

/**
 * Returns the standardized official action catalog for a named service or MCP object.
 */
export function getOfficialMcpTools(serviceOrObj = '') {
  const service = typeof serviceOrObj === 'string' && !serviceOrObj.includes(' ') && ['outlook', 'slack', 'github', 'jira', 'google', 'neo4j'].includes(serviceOrObj.toLowerCase())
    ? serviceOrObj.toLowerCase()
    : identifyMcpService(serviceOrObj);

  if (service === 'outlook') return OUTLOOK_OFFICIAL_ACTIONS;
  if (service === 'neo4j') return NEO4J_OFFICIAL_ACTIONS;
  if (service === 'github') return GITHUB_OFFICIAL_ACTIONS;
  if (service === 'slack') return SLACK_OFFICIAL_ACTIONS;
  if (service === 'jira') return JIRA_OFFICIAL_ACTIONS;
  if (service === 'google') return GOOGLE_WORKSPACE_OFFICIAL_ACTIONS;
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
