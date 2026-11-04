'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Center, Spinner } from '@chakra-ui/react';
import { createClient } from '@/utils/supabase/client';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check Redux store
        if (accessToken) {
          setIsLoading(false);
          return;
        }

        // Then check Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        router.replace('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, accessToken, supabase.auth]);

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return <>{children}</>;
}
