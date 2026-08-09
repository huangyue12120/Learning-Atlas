import unittest

from exercise_graph import dijkstra


class GraphExerciseTests(unittest.TestCase):
    def test_dijkstra_weighted_shortest_paths(self):
        graph = {0: [(1, 2), (2, 5)], 1: [(2, 1)], 2: []}
        self.assertEqual(dijkstra(graph, 0), {0: 0, 1: 2, 2: 3})


if __name__ == "__main__":
    unittest.main()
