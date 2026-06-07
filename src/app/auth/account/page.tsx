import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AccountForm from './account-form'

export default async function Account() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/account') // Redirect to an error page if the user is not authenticated
  }

  return <AccountForm user={data.user} />
}


// UNORTHODOX METHOD
// "use client";

// import { useRouter } from 'next/navigation'
// import { useEffect, useState } from 'react'
// import AccountForm from './account-form'
// import { supabase } from '@/utils/supabaseClient'
// import { User } from '@supabase/supabase-js'

// export default function Account() {
//   const router = useRouter()
//   const [user, setUser] = useState<User | null>(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchUser = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         router.push('/')
//       } else {
//         setUser(user)
//         setLoading(false)
//       }
//     }

//     fetchUser()
//   }, [router])

//   if (loading) {
//     return <div>Loading...</div>
//   }

//   return <AccountForm user={user} />
// }
