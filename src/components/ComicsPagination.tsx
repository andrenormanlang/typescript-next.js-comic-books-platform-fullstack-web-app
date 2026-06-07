import { Box, Button, Center, Stack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

type ComicsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const ComicsPagination: React.FC<ComicsPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const router = useRouter();

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  const goToLastPage = () => {
    onPageChange(totalPages);
  };

  return (
	<Box>
	{currentPage === totalPages && (
	  <Center my={4}>
		<Box>This is the last page at the moment</Box>
	  </Center>
	)}
    <Stack direction="row" gap={2} align="center" justify="center" my="1rem">
      <Button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
        First
      </Button>
      <Button onClick={() => onPageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
        Previous
      </Button>
      {/* ... additional buttons for page numbers ... */}
      <Button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
      <Button
        onClick={goToLastPage}
        disabled={currentPage === totalPages}
      >
        Last
      </Button>
    </Stack>
	</Box>
  );
};

export default ComicsPagination;
