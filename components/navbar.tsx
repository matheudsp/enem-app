"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { BookOpen, LogOut, User } from "lucide-react"

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-6 w-6" />
          <span>ENEM Practice</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex gap-6">
                <Link
                  href="/"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/") ? "text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  Exames
                </Link>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/dashboard") ? "text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/history"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/history") ? "text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  Histórico
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Perfil</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
