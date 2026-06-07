"use client";

import { useEffect, useState } from "react";
import { useUser } from "../../../contexts/UserContext";
import { Center, Spinner, Alert } from "@chakra-ui/react";
import UserListTable from "./UserListTable";
import ComicsListTable from "./ComicsListTable";
import ReceiptsListTable from "./ReceiptsListTable";
import { supabase } from "@/utils/supabase/client";

const AdminPage = () => {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type SupabaseError = {
    message: string;
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          if (data && data.is_admin) {
            setIsAdmin(true);
          }
        } catch (error) {
          setError((error as SupabaseError).message);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="100vh">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      </Center>
    );
  }

  if (!isAdmin) {
    return (
      <Center h="100vh">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Description>You do not have permission to access this page. Check your user role.</Alert.Description>
        </Alert.Root>
      </Center>
    );
  }

  return (
    <div>
      <UserListTable />
      <ComicsListTable />
      <ReceiptsListTable />
    </div>
  );
};

export default AdminPage;
