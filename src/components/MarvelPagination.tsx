import { Box, Button } from '@chakra-ui/react';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MarvelPagination: React.FC<Props> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <Box display="flex" justifyContent="center" mt="8" p={4}>
      <Button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        First
      </Button>
      <Button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        mx={2}
      >
        Previous
      </Button>
      <Button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        mx={2}
      >
        Next
      </Button>
      <Button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        Last
      </Button>
    </Box>
  );
};

export default MarvelPagination;

// import { Box, Button, Center, Stack } from '@chakra-ui/react';
// import { useRouter } from 'next/navigation';

// type ComicsPaginationProps = {
//   currentPage: number;
//   totalPages: number;
//   onPageChange: (page: number) => void;
// };

// const ComicsPagination: React.FC<ComicsPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
//   const router = useRouter();

//   const handlePageClick = (page: number) => {
//     onPageChange(page);
//   };

//   const goToLastPage = () => {
//     onPageChange(totalPages);
//   };

//   return (
// 	<Box>
// 	{currentPage === totalPages && (
// 	  <Center my={4}>
// 		<Box>This is the last page at the moment</Box>
// 	  </Center>
// 	)}
//     <Stack direction="row" gap={2} align="center" justify="center" my="1rem">
//       <Button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
//         First
//       </Button>
//       <Button onClick={() => onPageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
//         Previous
//       </Button>
//       {/* ... additional buttons for page numbers ... */}
//       <Button
//         onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
//         disabled={currentPage === totalPages}
//       >
//         Next
//       </Button>
//       <Button
//         onClick={goToLastPage}
//         disabled={currentPage === totalPages}
//       >
//         Last
//       </Button>
//     </Stack>
// 	</Box>
//   );
// };

// export default ComicsPagination;
