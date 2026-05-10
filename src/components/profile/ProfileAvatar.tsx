// src/components/profile/ProfileAvatar.tsx
interface Props {
  email: string
}

export function ProfileAvatar({ email }: Props) {
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
        <span className="text-black font-black text-2xl">{initials}</span>
      </div>
      <p className="text-zinc-400 text-sm">{email}</p>
    </div>
  )
}
