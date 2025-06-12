import * as React from "react"
import { cn } from "@/lib/utils"
import { Header } from "./header"
import { Footer } from "./footer"

interface LayoutProps {
  children: React.ReactNode
  className?: string
  headerTitle?: string
  showNavigation?: boolean
  showFooter?: boolean
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  className,
  headerTitle,
  showNavigation = true,
  showFooter = true 
}) => {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header 
        title={headerTitle} 
        showNavigation={showNavigation} 
      />
      
      <main className={cn("flex-1", className)}>
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  )
}

export { Layout }
