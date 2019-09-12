describe('counter', () => {
  it('gets initial data and increments on click', () => {
    cy.visit('/');
    cy.get('.counter').contains('0');
    cy.get('input').click();
    cy.get('.counter').contains('1');
  });
});

describe('secret', () => {
  it('gets env var', () => {
    cy.visit('/');
    cy.get('.secret').contains('shhh');
  });
});

describe('hack', () => {
  it('fails to access non exposed function', () => {
    cy.visit('/');
    cy.get('.notExposed .error').contains(/Cannot invoke index.hack - not an exposed function/);
  });

  it('fails to access module outside of root dir', () => {
    cy.visit('/');
    cy.get('.invalidFile .error').contains(/Cannot reference path outside of root dir: ..\/index/);
  });
});
