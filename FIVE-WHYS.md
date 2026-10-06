# Five whys: why do wrong submittals reach site?

Problem statement: *A glulam package in a weaker strength class than specified is approved and delivered. The frame erection stops while it is replaced.* (Synthetic scenario, built from common failure patterns.)

1. **Why was the wrong grade delivered?** Because the submittal was approved with GL24h when the spec called for GL28h.
2. **Why did the reviewer approve it?** Because the grade was stated once, on page 6 of a 40-page pack, and the reviewer was checking drawings and calculations at the time.
3. **Why was a simple grade check competing with drawing review?** Because one person does every check on a submittal in one pass, mechanical and judgment alike, in the order the PDF happens to be in.
4. **Why does one person do every check by hand?** Because the spec and the submittal are both documents, not data, so there is nothing to compare automatically. The tools manage the *flow* of submittals (log, status, Procore sync), not their *content*.
5. **Why hasn't content checking been automated?** Because the checks need the exact clause to be trusted, and a wrong automatic approval is worse than a slow manual one. Without explainable evidence and a human gate, no practice would accept it.

**Root cause:** content checks are manual because no tool links a submittal's facts to the spec clause they must meet, in a way a reviewer can trust and defend.

**Response:** run the mechanical checks as transparent rules on arrival, attach the clause to every flag, route judgment to the reviewer, and never auto-approve. That is Submittal Review Desk.
