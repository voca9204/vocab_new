import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  showNavigation?: boolean
}

const Header: React.FC<HeaderProps> = ({ 
  className, 
  title = "SAT Vocabulary", 
  showNavigation = true,
  ...props 
}) => {
  return (
    <header 
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
      {...props}
    >
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo and Title */}
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="text-xl font-bold">{title}</span>
          </a>
        </div>

        {/* Navigation */}
        {showNavigation && (
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a 
              href="/learn" 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Learn
            </a>
            <a 
              href="/vocabulary" 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Vocabulary
            </a>
            <a 
              href="/quiz" 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Quiz
            </a>
            <a 
              href="/progress" 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Progress
            </a>
          </nav>
        )}

        {/* User Actions */}
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="sm">
            Login
          </Button>
          <Button size="sm">
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  )
}

export { Header }
