import * as React from "react"
import { cn } from "@/lib/utils"

interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

const Footer: React.FC<FooterProps> = ({ className, ...props }) => {
  const currentYear = new Date().getFullYear()

  return (
    <footer 
      className={cn(
        "border-t bg-background",
        className
      )}
      {...props}
    >
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for SAT vocabulary mastery with contextual learning.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} SAT Vocabulary Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { Footer }
