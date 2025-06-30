# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Senior Engineer Standards

You are a high-performing senior engineer with expertise in Next.js and SQL. Your code must be:

1. **Simple and Clear**: Write code that a junior developer can easily understand and maintain
2. **Performant**: Optimize for performance without sacrificing readability
3. **Type-Safe**: Leverage TypeScript's strict mode to prevent runtime errors
4. **Well-Structured**: Follow established patterns and conventions consistently

## Mandatory Quality Gates

**CRITICAL**: Before completing ANY task, you MUST:

1. **Component Reuse Verification**: Use ast-grep to verify no component duplication
2. **TailwindCSS Verification**: Ensure only TailwindCSS classes are used for styling
3. **Run Type Checking**: `npm run typecheck` - Fix all TypeScript errors
4. **Run Linting**: `npm run lint` - Fix all ESLint errors and warnings
5. **Run Formatting**: `npm run stylecheck` - Ensure code formatting is correct
6. **Test Changes**: Run relevant tests to verify functionality

**No task is complete until ALL quality gates pass.**

### Component Reuse Quality Gate Commands

```bash
# Verify no duplicate button-like components
ast-grep --pattern 'export default function $NAME($$$) { $$$ }' --lang typescript | grep -i button

# Check for custom CSS usage (should return empty)
grep -r "style=" app/ components/ --include="*.tsx" --include="*.ts"

# Verify TailwindCSS-only usage
grep -r "className=" app/ components/ --include="*.tsx" | grep -v "cn(" | head -5

# Find any non-design-system color usage
grep -r "bg-red-[0-9]" app/ components/ --include="*.tsx" || echo "✅ No hardcoded colors found"
```

## Project Overview

The Shamiri Digital Hub is a Next.js-based platform that serves as the operational back-end for the Shamiri Institute. It manages educational programs, clinical screening, fellow supervision, and administrative operations across multiple hubs and schools.

## Package Management Policy

**ALWAYS use npm for package management tasks. Never use yarn, pnpm, or other package managers.**

Examples:

- `npm install <package>` - Install dependencies
- `npm run <script>` - Run npm scripts
- `npm audit` - Check for vulnerabilities

## Code Search and Analysis Tools

### ast-grep Usage (Installed and Available)

ast-grep is available for advanced code search and analysis. Use it for:

1. **Finding Patterns**: `ast-grep --pattern 'function $NAME($$$) { $$$ }'`
2. **Code Refactoring**: `ast-grep --pattern 'console.log($$$)' --rewrite 'logger.info($$$)'`
3. **Type Analysis**: `ast-grep --pattern 'interface $NAME { $$$ }'`
4. **Database Query Patterns**: `ast-grep --pattern 'prisma.$TABLE.findMany({ $$$ })'`

### Common Search Patterns for This Project

```bash
# Find all Server Actions
ast-grep --pattern 'export async function $NAME($$$) { $$$ }' --lang typescript

# Find Prisma queries with includes
ast-grep --pattern 'prisma.$TABLE.findMany({ include: { $$$ } })' --lang typescript

# Find React components
ast-grep --pattern 'export default function $NAME($$$) { $$$ }' --lang typescript

# Find role-based access patterns
ast-grep --pattern 'currentUser.role === $ROLE' --lang typescript

# COMPONENT DISCOVERY PATTERNS
# Find all components with specific patterns
ast-grep --pattern 'export default function $COMPONENT_NAME($$$) { $$$ }' --lang typescript

# Find all component imports from ui directory
ast-grep --pattern 'import { $$$ } from "#/components/ui/$FILE"' --lang typescript

# Find all existing form patterns
ast-grep --pattern 'const form = useForm<$TYPE>({ $$$ })' --lang typescript

# Find table/datatable usage patterns
ast-grep --pattern '<DataTable $$$columns={$COLUMNS}$$$data={$DATA}$$$ />' --lang typescript

# Find modal/dialog patterns
ast-grep --pattern '<Dialog$$$><DialogContent>$$$</DialogContent></Dialog>' --lang typescript
```

**Use ast-grep actively for code search, pattern matching, and refactoring tasks.**

## Component Reuse Policy

**ABSOLUTE RULE: ALWAYS USE EXISTING COMPONENTS FROM `/components` DIRECTORY**

### Mandatory Component Discovery Process

**BEFORE creating ANY new component, you MUST:**

1. **Search Existing Components**: Use ast-grep to find similar functionality
2. **Check Component Hierarchy**: Look in order of priority:
   - `components/ui/` - Base UI primitives (Button, Input, Card, etc.)
   - `components/common/` - Business logic components organized by feature
   - `components/` - Root level reusable components
3. **Extend, Don't Duplicate**: If similar functionality exists, extend it via props/composition
4. **Document Justification**: If creating new component is absolutely necessary, document why existing components couldn't be reused

### Component Search Patterns with ast-grep

```bash
# Find all Button usages and variants
ast-grep --pattern 'import { Button } from "#/components/ui/button"' --lang typescript

# Find all Card components
ast-grep --pattern 'import { Card, $$$ } from "#/components/ui/card"' --lang typescript

# Find all DataTable usages
ast-grep --pattern 'import DataTable from "#/components/data-table"' --lang typescript

# Find all form components
ast-grep --pattern 'import { $COMPONENT } from "#/components/ui/$FILE"' --lang typescript

# Find similar dialog/modal patterns
ast-grep --pattern 'import { Dialog, $$$ } from "#/components/ui/dialog"' --lang typescript
```

### NO DUPLICATION ALLOWED

**Prohibited Actions:**

- Creating new Button variants when existing Button component has variant system
- Building custom forms when form components exist in `components/ui/`
- Writing custom tables when DataTable component exists
- Creating new dialogs/modals when Dialog primitives exist
- Duplicating any existing component functionality

**Required Actions:**

- Always import from existing components
- Use component composition patterns
- Leverage variant systems (using `cva` patterns)
- Extend props interfaces when needed

### Component Reuse Workflow

**Step 1: Component Discovery**

```bash
# Before creating any component, search for existing ones
ast-grep --pattern 'export default function $NAME($$$) { $$$ }' --lang typescript | grep -i "button\|form\|table\|card\|dialog"

# Search specific component types
ast-grep --pattern 'import { $$$ } from "#/components/ui/button"' --lang typescript
ast-grep --pattern 'import { $$$ } from "#/components/ui/form"' --lang typescript
```

**Step 2: Component Analysis**

- Examine existing component props and variants
- Check if current requirements can be met with existing props
- Look for similar patterns in `components/common/`

**Step 3: Extension Strategy**

```typescript
// Good: Extending existing Button component
interface CustomButtonProps extends ButtonProps {
  customProp?: string;
}

function CustomButton({ customProp, ...props }: CustomButtonProps) {
  return (
    <Button
      {...props}
      className={cn("additional-classes", props.className)}
    >
      {/* Custom content */}
    </Button>
  );
}

// Good: Using composition with existing components
function ComplexForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Form>
          {/* Form fields using existing Input, Select, etc. */}
        </Form>
      </CardContent>
    </Card>
  );
}
```

### Available Components Inventory

**Base UI Components (`components/ui/`):**

- `Button` - All button variants with `cva` system
- `Card, CardHeader, CardTitle, CardContent, CardFooter` - Layout cards
- `Dialog, DialogContent, DialogHeader, DialogTitle` - Modal dialogs
- `Form, FormField, FormItem, FormLabel, FormControl` - Form components
- `Input, Select, Checkbox, RadioGroup` - Form inputs
- `Table, TableHeader, TableBody, TableRow, TableCell` - Data tables
- `Badge, Avatar, Skeleton` - Display components
- `Toast, Alert` - Feedback components

**Business Components (`components/common/`):**

- DataTable patterns in `components/data-table.tsx`
- Authentication flows in `components/common/`
- CRUD operations for each entity (fellow, student, school, etc.)
- File upload components
- Navigation components

**Reusable Patterns (`components/`):**

- Layout components (header, footer, navigation)
- Charts and data visualization
- Search and filtering components

## TailwindCSS-Only Styling Policy

**ABSOLUTE RULE: USE ONLY TAILWINDCSS FOR ALL STYLING**

### Mandatory Styling Guidelines

**REQUIRED:**

- All styling MUST use TailwindCSS classes only
- Use the `cn()` utility function for conditional/merged classes
- Leverage the existing design system from `tailwind.config.ts`
- Follow responsive design patterns with Tailwind breakpoints

**PROHIBITED:**

- Creating new CSS files (except `globals.css`)
- Using inline `style` prop
- Writing custom CSS classes
- Using CSS-in-JS solutions
- Any styling approach other than TailwindCSS

### Design System Colors (Use These ONLY)

**Brand Colors:**

```typescript
// Primary brand colors
"shamiri-new-blue"; // #0085FF - Primary brand blue
"shamiri-light-red"; // #E92C2C - Error/destructive actions
"shamiri-green"; // #00BA34 - Success states
"shamiri-text-grey"; // #969696 - Secondary text
"shamiri-light-grey"; // #E8E8E8 - Borders/dividers

// Semantic colors from design system
"blue-base"; // Light/Blue/Base
"blue-bg"; // Light/Blue/Background
"blue-border"; // Light/Blue/Border
"green-base"; // Light/Green/Base
"green-bg"; // Light/Green/Background
"green-border"; // Light/Green/Border
"red-base"; // Light/Red/Base
"red-bg"; // Light/Red/Background
"red-border"; // Light/Red/Border
```

### TailwindCSS Patterns

**Component Styling Example:**

```typescript
// Good: Using TailwindCSS with design system colors
<Button className="bg-shamiri-new-blue hover:bg-shamiri-blue-darker text-white">
  Submit
</Button>

// Good: Responsive design with Tailwind
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>

// Good: Using cn() utility for conditional classes
<div className={cn(
  "rounded-lg border p-4",
  isActive && "bg-blue-bg border-blue-border",
  isError && "bg-red-bg border-red-border"
)}>
  {/* Content */}
</div>
```

**Layout Patterns:**

```typescript
// Card layouts using existing Card component
<Card className="p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Data tables using existing DataTable
<DataTable
  columns={columns}
  data={data}
  className="rounded-lg border"
/>
```

### Design System Enforcement Rules

**Typography Scale:**

```typescript
// Use predefined text sizes
"text-xs"; // 12px
"text-sm"; // 14px
"text-base"; // 16px (default)
"text-lg"; // 18px
"text-xl"; // 20px
"text-2xl"; // 24px
"text-3xl"; // 30px

// Font weights
"font-normal"; // 400
"font-medium"; // 500
"font-semibold"; // 600
"font-bold"; // 700
```

**Spacing System:**

```typescript
// Use consistent spacing (4px increments)
"p-1" "p-2" "p-3" "p-4" "p-6" "p-8"  // Padding
"m-1" "m-2" "m-3" "m-4" "m-6" "m-8"  // Margin
"gap-1" "gap-2" "gap-3" "gap-4" "gap-6" "gap-8"  // Grid/Flex gaps

// Specific spacing for components
"space-x-2" "space-y-2"  // Between elements
```

**Border Radius:**

```typescript
"rounded-sm"; // 2px
"rounded"; // 4px
"rounded-md"; // 6px
"rounded-lg"; // 8px
"rounded-2xl"; // 16px (cards)
"rounded-full"; // 50% (avatars, badges)
```

**Component State Classes:**

```typescript
// Interactive states
"hover:bg-blue-bg"
"focus:ring-2 focus:ring-shamiri-new-blue/60"
"active:scale-95"
"disabled:opacity-50 disabled:pointer-events-none"

// Responsive breakpoints
"xs:" "sm:" "md:" "lg:" "xl:" "2xl:"
```

**Layout Patterns:**

```typescript
// Grid layouts
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
"grid grid-cols-12"; // 12-column grid

// Flexbox patterns
"flex flex-col space-y-4";
"flex items-center justify-between";
"flex flex-wrap gap-2";

// Container patterns
"container mx-auto px-4";
"max-w-7xl mx-auto";
```

### Anti-Patterns to Avoid

**DON'T:**

```typescript
// Custom CSS
<div style={{ color: 'red' }}>  // ❌ Never use inline styles
<div className="custom-class">  // ❌ No custom CSS classes

// Non-design-system colors
<div className="bg-red-500">    // ❌ Use design system colors
<Button className="bg-blue-400"> // ❌ Use shamiri-new-blue instead

// Arbitrary values when design system exists
<div className="p-[13px]">      // ❌ Use predefined spacing
<div className="text-[15px]">   // ❌ Use predefined text sizes
```

**DO:**

```typescript
// Design system colors
<div className="bg-red-bg border-red-border text-red-base">
<Button className="bg-shamiri-new-blue hover:bg-shamiri-blue-darker">

// Predefined spacing and typography
<div className="p-4 text-sm font-medium">
<h2 className="text-lg font-semibold text-shamiri-text-dark-grey">
```

## Key Development Commands

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database Operations

- `npm run db:dev:up` - Start local PostgreSQL database using Docker
- `npm run db:dev:migrate` - Run Prisma migrations in development
- `npm run db:dev:migrate:reset` - Reset and reapply all migrations
- `npm run db:dev:seed` - Seed database with test data
- `npm run db:dev:types` - Generate Prisma client types

### Code Quality

- `npm run lint` - Run ESLint (MANDATORY before task completion)
- `npm run typecheck` - Run TypeScript type checking (MANDATORY before task completion)
- `npm run format` - Format code with Prettier
- `npm run stylecheck` - Check code formatting (MANDATORY before task completion)

### Testing

- `npm run test:dev` - Run Playwright tests in development
- `npm run test:dev:ui` - Run Playwright tests with UI
- `npm run test:unit` - Run Vitest unit tests
- `npm run test:ci` - Run tests in CI mode

## Architecture Overview

### Role-Based Access Control (RBAC)

The platform uses a sophisticated RBAC system with the following roles:

- **SUPERVISOR** - Manages fellows and student groups
- **HUB_COORDINATOR** - Oversees operations across multiple schools
- **FELLOW** - Conducts interventions with students
- **CLINICAL_LEAD** - Handles clinical cases and screenings
- **CLINICAL_TEAM** - Supports clinical operations
- **OPERATIONS** - Administrative oversight

### Database Schema

- Uses Prisma ORM with PostgreSQL
- Implements prefixed Object IDs (e.g., `sup_xxxxx`, `hc_xxxxx`) for better readability and security
- Key entities: Users, Schools, Students, Fellows, Supervisors, Clinical Cases, Sessions

### Application Structure

```
app/
├── (auth)/           # Authentication pages
├── (platform)/       # Main application routes
│   ├── hc/          # Hub Coordinator dashboard
│   ├── sc/          # Supervisor dashboard
│   ├── fel/         # Fellow dashboard
│   ├── cl/          # Clinical Lead dashboard
│   ├── ct/          # Clinical Team dashboard
│   └── ops/         # Operations dashboard
├── api/             # API routes
└── globals.css      # Global styles
```

### Key Technical Patterns

#### Authentication & Authorization

- Uses NextAuth.js with Google OAuth provider
- Session management via `getCurrentUser()` in `app/auth.ts`
- Role-specific data fetching functions (e.g., `currentSupervisor()`, `currentHubCoordinator()`)

#### Data Fetching

- Server Actions for data mutations
- Prisma queries with comprehensive `include` statements for related data
- Transaction support via `TransactionCursor` type

#### UI Components

- Radix UI primitives with custom styling
- Tailwind CSS for styling
- Recharts for data visualization
- React Hook Form with Zod validation

### File Organization

- `components/ui/` - Reusable UI components
- `components/common/` - Business logic components organized by feature
- `lib/actions/` - Server actions organized by entity
- `lib/` - Utility functions and shared logic
- `models/` - Type definitions

## Git Commit Standards

**ALL COMMITS MUST FOLLOW CONVENTIONAL COMMIT SYNTAX:**

Format: `<type>[optional scope]: <description>`

### Commit Types:

- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance tasks, dependency updates
- `docs`: Documentation changes
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `style`: Code style changes (formatting, missing semicolons)
- `perf`: Performance improvements

### Examples:

```
feat(auth): add Google OAuth integration
fix(database): resolve migration rollback issue
chore(deps): update Next.js to v14.2.23
refactor(components): extract reusable form validation
```

**Commit messages should be clear, concise, and explain the "why" not just the "what".**

## Development Guidelines

### Database Changes

1. Modify `prisma/schema.prisma`
2. Run `npm run db:dev:migrate` to create migration
3. Test migration with `npm run db:dev:migrate:reset`
4. Update seed data if needed
5. **MANDATORY**: Run `npm run typecheck` after schema changes

### Adding New Features

1. Create server actions in `lib/actions/`
2. Add UI components in appropriate `components/` subdirectory
3. Implement page components in `app/(platform)/` route structure
4. Add necessary types and validation schemas
5. **MANDATORY**: Run quality gates before marking feature complete

### Code Style

- Uses Prettier with Tailwind CSS plugin
- Follows Next.js 14 App Router conventions
- Implements TypeScript strict mode
- Uses consistent import aliasing with `#/` prefix

### Testing

- E2E tests use Playwright with role-based fixtures
- Unit tests use Vitest with React Testing Library
- Test fixtures stored in `tests/fixtures/`
- **Run relevant tests after code changes**

## Technical Excellence Guidelines

### Zod Schema Validation Policy

**ABSOLUTE RULE: ALWAYS USE ZOD FOR ALL PAYLOAD VALIDATION**

#### Mandatory Zod Usage

**REQUIRED for ALL:**

- API route request body validation
- Server action form data validation
- React Hook Form schema validation
- Any data parsing from external sources

**PROHIBITED:**

- Custom validation functions for structured data
- Manual type checking for request payloads
- Unvalidated `any` types from API requests
- Direct use of `request.json()` without validation

#### Zod Schema Patterns

**API Route Validation:**

```typescript
import { z } from "zod";
import { stringValidation } from "#/lib/utils";

const CreateUserSchema = z.object({
  name: stringValidation("Name is required"),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(1).max(120),
  role: z.enum(["USER", "ADMIN"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Always use safeParse for validation
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      const errorMessages = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errorMessages,
        },
        { status: 400 },
      );
    }

    const validatedData = result.data;
    // Use validatedData instead of body
  } catch (error) {
    // Handle parsing errors
  }
}
```

**Server Action Validation:**

```typescript
"use server";

import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: stringValidation("Name is required"),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const result = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  // Use result.data for validated input
  const { name, bio } = result.data;
}
```

**React Hook Form Integration:**

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  title: stringValidation("Title is required"),
  description: z.string().min(10, "Description too short"),
  priority: z.enum(["low", "medium", "high"]),
});

type FormData = z.infer<typeof FormSchema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      priority: "medium",
    },
  });

  // Form implementation
}
```

#### Schema Organization

**Schema Location:**

- Store schemas in `schema.ts` files alongside components
- Export reusable validation patterns from `#/lib/validators.ts`
- Use consistent naming: `[Entity][Action]Schema` (e.g., `UserCreateSchema`)

**Common Validation Patterns:**

```typescript
// Use existing utility functions
import { stringValidation } from "#/lib/utils";

// Standard patterns for common fields
const IdSchema = stringValidation("ID is required");
const EmailSchema = z.string().email("Invalid email format");
const UrlSchema = z.string().url("Invalid URL format");
const DateSchema = z.string().datetime("Invalid date format");

// Rating scales (common in this project)
const RatingSchema = z
  .number({ invalid_type_error: "Rating must be a number" })
  .int("Rating must be an integer")
  .min(1, "Rating must be between 1 and 5")
  .max(5, "Rating must be between 1 and 5");

// Optional fields with proper handling
const OptionalTextSchema = z.string().max(1000).optional();
```

#### Error Handling Best Practices

**Structured Error Responses:**

```typescript
// Good: Detailed validation errors
if (!result.success) {
  const errorMessages = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  return NextResponse.json(
    {
      error: "Validation failed",
      details: errorMessages,
    },
    { status: 400 },
  );
}

// Good: Form field errors
if (!result.success) {
  return {
    success: false,
    errors: result.error.flatten().fieldErrors,
  };
}
```

**Type Safety:**

```typescript
// Always use z.infer for type generation
type CreateUserInput = z.infer<typeof CreateUserSchema>;

// Never manually define types that match schemas
// Bad: Manual type definition
interface CreateUserInput {
  name: string;
  email: string;
  age: number;
}
```

#### Validation Quality Gates

**MANDATORY CHECKS:**

1. All API routes must validate request bodies with Zod
2. All server actions must validate form data with Zod
3. All forms must use `zodResolver` for validation
4. All schemas must have descriptive error messages
5. All validation errors must be properly handled and returned

**CODE REVIEW CHECKLIST:**

- [ ] No direct use of `request.json()` without validation
- [ ] No custom validation functions for structured data
- [ ] All schemas use appropriate validation rules
- [ ] Error messages are user-friendly and specific
- [ ] Types are generated from schemas using `z.infer<>`
- [ ] Code is self-documenting with minimal comments
- [ ] Comments only explain WHY, not WHAT the code does

### Code Documentation and Comments Policy

**ABSOLUTE RULE: CODE SHOULD BE SELF-DOCUMENTING**

#### Comment Usage Guidelines

**REQUIRED COMMENTS:**

- Complex business logic that isn't immediately obvious
- Non-trivial algorithms or calculations
- Workarounds for framework/library limitations
- Security-sensitive operations
- Performance-critical optimizations

**PROHIBITED COMMENTS:**

- Obvious code explanations
- Restating what the code does
- Outdated or redundant information
- TODO comments (use proper issue tracking)
- Commented-out code (use git history)

#### Good vs Bad Examples

**❌ BAD: Obvious comments**

```typescript
// Create a new user
const user = await db.user.create({ data: userData });

// Check if user exists
if (!user) {
  return { error: "User not found" };
}

// Return success response
return { success: true, data: user };
```

**✅ GOOD: Self-documenting code**

```typescript
const user = await db.user.create({ data: userData });

if (!user) {
  return { error: "User not found" };
}

return { success: true, data: user };
```

**✅ GOOD: Necessary comments for complex logic**

```typescript
// Apply rate limiting to prevent abuse - max 5 requests per minute per IP
const isRateLimited = await checkRateLimit(request.ip, 5, 60);

// Complex business rule: Fellows can only be assigned to schools
// within their designated hub unless supervisor explicitly overrides
const isValidAssignment =
  fellow.hubId === school.hubId || supervisorOverride === true;

// Performance optimization: Batch database updates to reduce transaction overhead
await db.$transaction(async (tx) => {
  const updates = students.map((student) =>
    tx.student.update({ where: { id: student.id }, data: student.data }),
  );
  await Promise.all(updates);
});
```

#### Self-Documenting Code Principles

**Use Descriptive Names:**

```typescript
// ❌ BAD: Unclear naming
const data = await fetch(url);
const result = process(data);

// ✅ GOOD: Self-explanatory
const sessionAnalysisData = await fetchSessionAnalysis(sessionId);
const validatedAnalysis = validateSessionAnalysis(sessionAnalysisData);
```

**Extract Complex Logic:**

```typescript
// ❌ BAD: Inline complex logic
if (
  user.role === "FELLOW" &&
  user.hubId === session.school.hubId &&
  session.sessionDate >= user.startDate &&
  !user.droppedOut
) {
  // Allow access
}

// ✅ GOOD: Extracted function
const canFellowAccessSession = (
  fellow: Fellow,
  session: InterventionSession,
) => {
  return (
    fellow.hubId === session.school.hubId &&
    session.sessionDate >= fellow.startDate &&
    !fellow.droppedOut
  );
};

if (user.role === "FELLOW" && canFellowAccessSession(user, session)) {
  // Allow access
}
```

**Use Type Definitions for Clarity:**

```typescript
// ✅ GOOD: Types explain structure and purpose
interface SessionAnalysisInput {
  sessionId: string;
  gradingScores: GradingRubricScores;
  qualitativeFeedback: QualitativeFeedback;
  metadata: AnalysisMetadata;
}

interface GradingRubricScores {
  protocolAdherence: number; // 1-7 scale
  contentSpecifications: number; // 1-7 scale
  contentThoroughness: number; // 1-7 scale
  contentSkillfulness: number; // 1-7 scale
  contentClarity: number; // 1-7 scale
  protocolCompliance: number; // 1-7 scale
}
```

#### When Comments ARE Needed

**Complex Business Rules:**

```typescript
// School dropout requires supervisor approval AND hub coordinator notification
// This is mandated by the education ministry regulations (Policy XYZ-2024)
const processSchoolDropout = async (schoolId: string, reason: string) => {
  await requireSupervisorApproval(schoolId);
  await notifyHubCoordinator(schoolId, reason);
  await updateMinistryDatabase(schoolId, "DROPOUT");
};
```

**Performance Optimizations:**

```typescript
// Debounce search to prevent excessive API calls during typing
const debouncedSearch = useMemo(
  () => debounce(performSearch, 300),
  [performSearch],
);
```

**Security Considerations:**

```typescript
// Hash passwords before storage - never store plaintext
const hashedPassword = await bcrypt.hash(password, 12);

// Sanitize user input to prevent XSS attacks
const sanitizedBio = DOMPurify.sanitize(userBio);
```

**Framework Workarounds:**

```typescript
// NextJS App Router requires this pattern for dynamic imports
// See: https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
const DynamicChart = dynamic(() => import("./Chart"), {
  ssr: false, // Chart library not compatible with SSR
});
```

#### JSDoc for Public APIs

**Use JSDoc for exported functions/components:**

```typescript
/**
 * Creates a new session analysis with validated grading scores.
 *
 * @param sessionId - ID of the intervention session to analyze
 * @param analysisData - Raw analysis data from LLM service
 * @returns Promise resolving to created analysis or error
 *
 * @throws {ValidationError} When grading scores are outside 1-7 range
 * @throws {NotFoundError} When session doesn't exist
 */
export async function createSessionAnalysis(
  sessionId: string,
  analysisData: RawAnalysisData,
): Promise<SessionAnalysis> {
  // Implementation
}
```

### SQL and Database Optimization

#### Prisma Query Patterns

```typescript
// Good: Selective includes
const users = await prisma.user.findMany({
  include: {
    profile: true,
    role: true,
  },
  where: { active: true },
});

// Bad: Over-fetching
const users = await prisma.user.findMany({
  include: {
    profile: { include: { address: true } },
    sessions: { include: { attendances: true } },
  },
});
```

#### Transaction Patterns

```typescript
// Use TransactionCursor for complex operations
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.profile.create({
    data: { ...profileData, userId: user.id },
  });
});
```

#### Query Optimization

- Always use `where` clauses for filtering
- Leverage database indexes for frequently queried fields
- Use `select` when you only need specific fields
- Batch operations when possible

### Next.js Performance Patterns

#### Server Actions Best Practices

```typescript
// Good: Type-safe with Zod validation
export async function createUser(formData: FormData) {
  const validatedData = userSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  return await prisma.user.create({ data: validatedData });
}
```

#### Component Optimization

- Use React.memo for expensive computations
- Implement proper loading states
- Leverage Suspense boundaries
- Extract reusable logic into custom hooks

#### Error Handling Patterns

```typescript
// Good: Comprehensive error handling
try {
  const result = await serverAction(data);
  return { success: true, data: result };
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    return { success: false, error: "Database error" };
  }
  return { success: false, error: "Unknown error" };
}
```

### Code Organization for Junior Developers

#### Clear Function Naming

```typescript
// Good: Self-documenting
async function getCurrentUserSupervisorRole(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { supervisor: true },
  });
}

// Bad: Unclear purpose
async function getUser(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: { supervisor: true },
  });
}
```

#### Type Safety First

- Define interfaces for all data structures
- Use Zod schemas for validation
- Leverage TypeScript's strict mode features
- Avoid `any` type usage

#### Component Structure

```typescript
// Good: Clear component structure
interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export default function UserProfile({ user, onUpdate }: Props) {
  // Component logic here
}
```

### Role-Based Access Control (RBAC) Patterns

#### Secure Role Checking

```typescript
// Good: Type-safe role validation
function requireRole(user: User, allowedRoles: Role[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
}

// Usage
await requireRole(currentUser, ["SUPERVISOR", "HUB_COORDINATOR"]);
```

#### Data Access Patterns

```typescript
// Good: Role-based data filtering
async function getSchoolsForUser(user: User) {
  switch (user.role) {
    case "HUB_COORDINATOR":
      return await prisma.school.findMany({
        where: { hubId: user.hubCoordinator?.hubId },
      });
    case "SUPERVISOR":
      return await prisma.school.findMany({
        where: { supervisors: { some: { id: user.supervisor?.id } } },
      });
    default:
      throw new Error("Unauthorized access");
  }
}
```

## Environment Setup

Requires `.env.development` file with:

- Database URL for PostgreSQL
- NextAuth configuration
- Google OAuth credentials
- AWS S3 configuration for file uploads
- Email service configuration

## Deployment

- Hosted on Vercel
- Uses preview deployments for feature branches
- Production migrations run automatically via `vercel:build` script
- Supports multiple environments (development, preview, production)
