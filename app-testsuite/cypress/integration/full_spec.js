describe('counter', () => {
  it('gets initial data and increments on click', () => {
    cy.visit('/');
    cy.get('.secret').contains('shhh');
    cy.get('.counter').contains('0');
    cy.get('input').click();
    cy.get('.counter').contains('1');
  });
});
