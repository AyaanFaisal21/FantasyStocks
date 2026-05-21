import { supabase } from '../supabaseClient';

export const generateMatchups = async (leagueId, setStatus, setLoading) => {
  setLoading(true);
  setStatus("Generating matchups...");

  try {
    // Fetch league members
    const { data: members, error: memberError } = await supabase
      .from('league_members')
      .select('league_member_id')
      .eq('league_id', leagueId);

    if (memberError) throw memberError;

    if (!members || members.length < 2) {
      setStatus("Not enough members to generate matchups.");
      setLoading(false);
      return;
    }

    // Clone members list and pad with bye (null) if odd number
    const paddedMembers = [...members];
    if (paddedMembers.length % 2 !== 0) {
      paddedMembers.push({ league_member_id: null });
    }

    const n = paddedMembers.length;
    const rounds = n - 1;
    const generatedMatchups = [];

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < n / 2; i++) {
        const user1 = paddedMembers[i].league_member_id;
        const user2 = paddedMembers[n - 1 - i].league_member_id;

        // Skip bye matchups
        if (user1 === null || user2 === null) continue;

        generatedMatchups.push({
          league_id: leagueId, // ✅ Include this line
          week: round + 1,
          user1_id: user1,
          user2_id: user2,
          u1_score: null,
          u2_score: null,
          winner_id: null,
        });
      }

      // Rotate members clockwise for next round (except the first member)
      const rest = paddedMembers.slice(1);
      rest.unshift(rest.pop());
      paddedMembers.splice(1, paddedMembers.length - 1, ...rest);
    }

    // Insert into matchups table
    const { error: insertError } = await supabase
      .from('matchups')
      .insert(generatedMatchups);

    if (insertError) throw insertError;

    setStatus("Matchups generated and saved successfully!");
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }

  setLoading(false);
};
